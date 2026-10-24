const assert = require('node:assert/strict');
const test = require('node:test');

// Test isolation and rollback state machines directly
function createStoreState(initial) {
  let state = {
    session: null,
    snapshot: null,
    pending: [],
    quarantinedPending: {},
    scheduled: [],
    settings: { reduceMotion: false },
    error: null,
    ...initial,
  };

  const listeners = [];
  const setState = (updater) => {
    state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
    listeners.forEach((l) => l(state));
  };

  return {
    getState: () => state,
    setState,
    signIn: async (token, user, snapshot) => {
      const prevUserId = state.session?.user.id;
      const newUserId = user.id;
      let newQuarantine = { ...state.quarantinedPending };
      let newPending = state.pending;

      if (prevUserId && prevUserId !== newUserId && state.pending.length > 0) {
        newQuarantine[prevUserId] = [...(newQuarantine[prevUserId] ?? []), ...state.pending];
        newPending = [];
      }

      if (newQuarantine[newUserId] && newQuarantine[newUserId].length > 0) {
        newPending = [...newPending, ...newQuarantine[newUserId]];
        delete newQuarantine[newUserId];
      }

      setState({
        session: { token, user, since: new Date().toISOString() },
        snapshot,
        pending: newPending,
        quarantinedPending: newQuarantine,
        error: null,
      });
    },
    signOut: () => {
      const currentUserId = state.session?.user.id;
      let newQuarantine = { ...state.quarantinedPending };
      if (currentUserId && state.pending.length > 0) {
        newQuarantine[currentUserId] = [...(newQuarantine[currentUserId] ?? []), ...state.pending];
      }
      setState({
        session: null,
        snapshot: null,
        pending: [],
        quarantinedPending: newQuarantine,
        error: null,
      });
    },
    addReading: (pondId, values) => {
      const r = { id: 'r-' + Date.now(), pondId, at: new Date().toISOString(), by: state.session?.user.name ?? 'Petugas', values, synced: false };
      setState({ pending: [...state.pending, r] });
      return r;
    },
    toggleTask: async (taskId, setTaskDoneApi) => {
      const task = state.snapshot?.tasks.find((t) => t.id === taskId);
      if (!task || !state.session) return;
      const prevDone = task.done;
      const targetDone = !prevDone;
      setState({
        error: null,
        snapshot: {
          ...state.snapshot,
          tasks: state.snapshot.tasks.map((t) => (t.id === taskId ? { ...t, done: targetDone } : t)),
        },
      });
      try {
        await setTaskDoneApi(state.session.token, taskId, targetDone);
      } catch (e) {
        setState({
          error: e.message || 'Gagal memperbarui status tugas.',
          snapshot: {
            ...state.snapshot,
            tasks: state.snapshot.tasks.map((t) => (t.id === taskId ? { ...t, done: prevDone } : t)),
          },
        });
      }
    },
    schedule: async (recId, scheduleApi) => {
      if (state.scheduled.includes(recId) || !state.session) return false;
      setState({ error: null, scheduled: [...state.scheduled, recId] });
      try {
        await scheduleApi(state.session.token, recId);
        return true;
      } catch (e) {
        setState({
          error: e.message || 'Gagal menjadwalkan rekomendasi.',
          scheduled: state.scheduled.filter((id) => id !== recId),
        });
        return false;
      }
    },
  };
}

test('quarantines pending readings per user across sign out and sign in', async () => {
  const store = createStoreState();
  const dummySnapshot = { farm: { id: 'f', name: 'Farm', initials: 'F', bloks: [] }, ponds: [], readings: [], riskScores: [], recommendations: [], tasks: [], feedTodayKg: null };

  // User A signs in and creates 2 offline readings
  await store.signIn('tokA', { id: 'userA', name: 'User A', role: 'teknisi' }, dummySnapshot);
  store.addReading('A1', { WarnaAir: 0 });
  store.addReading('A2', { WarnaAir: 1 });
  assert.equal(store.getState().pending.length, 2);

  // User A signs out -> readings quarantined, NOT cleared silently
  store.signOut();
  assert.equal(store.getState().pending.length, 0);
  assert.equal(store.getState().quarantinedPending['userA'].length, 2);

  // User B signs in -> user B has 0 pending readings (isolated!)
  await store.signIn('tokB', { id: 'userB', name: 'User B', role: 'teknisi' }, dummySnapshot);
  assert.equal(store.getState().pending.length, 0);
  // User B creates 1 reading
  store.addReading('B1', { WarnaAir: 2 });
  assert.equal(store.getState().pending.length, 1);

  // User B signs out
  store.signOut();
  assert.equal(store.getState().pending.length, 0);
  assert.equal(store.getState().quarantinedPending['userB'].length, 1);
  assert.equal(store.getState().quarantinedPending['userA'].length, 2);

  // User A logs back in -> user A's 2 pending readings restored!
  await store.signIn('tokA', { id: 'userA', name: 'User A', role: 'teknisi' }, dummySnapshot);
  assert.equal(store.getState().pending.length, 2);
  assert.equal(store.getState().quarantinedPending['userA'], undefined);
});

test('rolls back optimistic task toggle and sets error state on failure', async () => {
  const store = createStoreState({
    snapshot: {
      farm: { id: 'f', name: 'F', initials: 'F', bloks: [] },
      ponds: [],
      readings: [],
      riskScores: [],
      recommendations: [],
      tasks: [{ id: 't1', title: 'Task 1', time: '08.00', note: '', done: false }],
      feedTodayKg: null,
    },
    session: { token: 'tok', user: { id: 'u', name: 'U', role: 'teknisi' }, since: '' },
  });

  const failingApi = async () => {
    throw new Error('Jaringan terputus');
  };

  await store.toggleTask('t1', failingApi);
  assert.equal(store.getState().snapshot.tasks[0].done, false);
  assert.equal(store.getState().error, 'Jaringan terputus');
});

test('rolls back optimistic schedule recommendation and sets error state on failure', async () => {
  const store = createStoreState({
    session: { token: 'tok', user: { id: 'u', name: 'U', role: 'pemilik' }, since: '' },
  });

  const failingApi = async () => {
    throw new Error('Gagal dari server');
  };

  const ok = await store.schedule('rec-99', failingApi);
  assert.equal(ok, false);
  assert.deepEqual(store.getState().scheduled, []);
  assert.equal(store.getState().error, 'Gagal dari server');
});

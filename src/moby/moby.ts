declare global {
  interface Window {
    modifiedStack?: Watchable[];
    observingStack?: Watchable[];
  }
}

function startTrackingObservables() {
  if (window.observingStack) {
    throw new Error("already tracking an observable?");
  }

  window.observingStack = [];
}

function stopTrackingObservables() {
  if (!window.observingStack) {
    throw new Error("not currnetly observing");
  }

  const tracked = [...window.observingStack];

  window.observingStack = undefined;

  return tracked;
}

function startTrackingModifications() {
  if (window.modifiedStack) {
    throw new Error("already tracking modifications");
  }

  window.modifiedStack = [];
}

function stopTrackingModifications() {
  if (!window.modifiedStack) {
    throw new Error("havent started tracking");
  }

  const tracked = [...window.modifiedStack];

  window.modifiedStack = undefined;

  return tracked;
}

class Surface<T> {
  private tracking: Set<Watchable> = new Set();

  private oldX?: T;

  constructor(
    private readonly query: () => T,
    private readonly effect: (x: T) => void,
  ) {
    startTrackingObservables();
    this.oldX = query();
    this.tracking = new Set(stopTrackingObservables());

    this.tracking.forEach((t) => t.subscribe(this.trigger));
  }

  trigger = () => {
    startTrackingObservables();
    const x = this.query();
    const newTracking = new Set(stopTrackingObservables());

    const newObservables = new Set(
      [...newTracking].filter((t) => !this.tracking.has(t)),
    );
    newObservables.forEach((t) => t.subscribe(this.trigger));

    const droppedObservables = new Set(
      [...this.tracking].filter((t) => !newTracking.has(t)),
    );
    droppedObservables.forEach((t) => t.unsubscribe(this.trigger));

    this.tracking = newTracking;

    if (this.oldX !== x) {
      this.effect(x);
    }
  };

  disposer = () => {
    this.tracking.forEach((t) => t.unsubscribe(this.trigger));
  };
}

class Watchable {
  toTrigger: Set<() => void> = new Set();

  constructor() {}

  subscribe = (cb: () => void) => {
    this.toTrigger.add(cb);
  };

  unsubscribe = (cb: () => void) => {
    this.toTrigger.delete(cb);
  };
}

export function monitor<T>(query: () => T, effect: (x: T) => void): () => void {
  const surface = new Surface<T>(query, effect);

  return surface.disposer;
}

export function watchable<T extends object>(target: T): T {
  const me = new Watchable();

  const handler: ProxyHandler<T> = {
    get(target, prop, receiver) {
      if (window.observingStack) {
        window.observingStack.push(me);
      }

      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value) {
      if (!window.modifiedStack) {
        throw new Error("modified watched state outside of a sideeffect");
      }

      window.modifiedStack.push(me);

      return Reflect.set(target, prop, value);
    },
  };

  const proxy = new Proxy<T>(target, handler);

  return proxy;
}

export function sideEffect(toRun: () => void) {
  return () => runAsSideEffect(toRun);
}

export function runAsSideEffect(toRun: () => void) {
  startTrackingModifications();
  toRun();
  const trackedModifications = stopTrackingModifications();

  const triggers = new Set<() => void>(
    ...trackedModifications.map((t) => t.toTrigger).flat(),
  );

  triggers.forEach((t) => t());
}

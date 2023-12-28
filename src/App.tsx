import { useState } from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react-lite";
import * as moby from "./moby/moby";

mobx.configure({
  enforceActions: "always",
});

class Store {
  @mobx.observable count = 0;

  something = 2;

  constructor() {
    mobx.makeObservable(this);
  }
}

interface ComponentProps {
  store: Store;
};

const Component: React.ComponentType<ComponentProps> = observer((props) => {
  const { store } = props;

  return (
    <>
      <p>hi {store.count + 0}</p>
    </>
  );
});

function MobXApp() {
  const [globalStore] = useState(new Store());

  return (
    <>
      <button
        onClick={mobx.action(() => {
          globalStore.count += 1;
          console.log("hello world", globalStore.count);
        })}
      >
        globalstore increase
      </button>

      <Component store={globalStore} />
    </>
  );
}

const state = moby.watchable({
  counter: 0,
  name: "bobbo",
});

moby.monitor(
  () => {
    console.log("monitor is running");

    return state.counter;
  },
  (counter) => {
    console.log(`counter is now ${counter}`);

    console.log(state.name);
  },
);

moby.monitor(
  () => {
    console.log("second monitor is running");

    return state.name;
  },
  (name) => {
    console.log("name is now", name);
  },
);

function App() {
  return (
    <>
      <button
        onClick={() => {
          state.counter += 1;
        }}
      >
        increment
      </button>

      <button
        onClick={moby.sideEffect(() => {
          state.counter += 1;
        })}
      >
        state increment
      </button>

      <button
        onClick={moby.sideEffect(() => {
          state.name = "Bob " + Math.random();
        })}
      >
        state name change
      </button>
    </>
  );
}

export default App;

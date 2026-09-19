import { getState, subscribe } from "./state.js";

const routes = new Map();

export function registerRoute(name, renderFn) {
  routes.set(name, renderFn);
}

export function startRouter(container, onRouteChange) {
  function render() {
    const { route, routeParams } = getState();
    const fn = routes.get(route) || routes.get("dashboard");
    if (onRouteChange) onRouteChange(route);
    container.innerHTML = "";
    const node = fn(routeParams);
    if (node) container.appendChild(node);
  }
  subscribe(render);
  render();
}
// VNode utils for Vue 3
import { find, isCallable, isNullOrUndefined, isTextInput } from './index';

function getVNodeData (vnode: any) {
  return vnode.props || {};
}

function getVNodeDirectives (vnode: any) {
  const data = getVNodeData(vnode);
  return data.directives || [];
}

function isComponentVNode (vnode: any) {
  return !!(vnode.type && typeof vnode.type === 'object');
}

export function findModel (vnode: any) {
  if (!vnode) return null;

  const data = getVNodeData(vnode);

  if (data && ('modelValue' in data || 'value' in data)) {
    const prop = 'modelValue' in data ? 'modelValue' : 'value';
    const event = prop === 'modelValue' ? 'update:modelValue' : 'input';
    return {
      expression: null,
      value: data[prop],
      modifiers: {},
      prop,
      event
    };
  }

  return null;
}

function extractChildren (vnode: any) {
  if (Array.isArray(vnode)) {
    return vnode;
  }

  if (Array.isArray(vnode.children)) {
    return vnode.children;
  }

  return [];
}

export function extractVNodes (vnode: any) {
  if (findModel(vnode)) {
    return [vnode];
  }

  const children = extractChildren(vnode);

  return children.reduce((nodes: any[], node: any) => {
    const candidates = extractVNodes(node);
    if (candidates.length) {
      nodes.push(...candidates);
    }
    return nodes;
  }, []);
}

export function findModelConfig (vnode: any) {
  if (isComponentVNode(vnode)) {
    const type = vnode.type;
    if (type && type.model) return type.model;
    if (type && type.props) {
      const hasModelValue = type.props.modelValue !== undefined || type.props.value !== undefined;
      return hasModelValue ? { prop: 'modelValue', event: 'update:modelValue' } : { prop: 'value', event: 'input' };
    }
    return { prop: 'modelValue', event: 'update:modelValue' };
  }
  return null;
}

function toEventKey (eventName: string) {
  return 'on' + eventName.charAt(0).toUpperCase() + eventName.slice(1);
}

export function mergeVNodeListeners (obj: Record<string, any>, eventName: string, handler: Function) {
  const key = toEventKey(eventName);
  if (isCallable(obj[key])) {
    const prevHandler = obj[key];
    obj[key] = [prevHandler];
  }
  if (isNullOrUndefined(obj[key])) {
    obj[key] = [];
  }
  obj[key].push(handler);
}

function addNativeNodeListener (node: any, eventName: string, handler: Function) {
  const key = toEventKey(eventName);
  if (!node.props) node.props = {};
  const target = node.props;
  if (isCallable(target[key])) {
    target[key] = [target[key]];
  }
  if (isNullOrUndefined(target[key])) {
    target[key] = [];
  }
  target[key].push(handler);
}

function addComponentNodeListener (node: any, eventName: string, handler: Function) {
  if (!node.props) node.props = {};
  const key = toEventKey(eventName);
  if (isCallable(node.props[key])) node.props[key] = [node.props[key]];
  if (!node.props[key]) node.props[key] = [];
  node.props[key].push(handler);
}

export function addVNodeListener (vnode: any, eventName: string, handler: Function) {
  if (isComponentVNode(vnode)) {
    addComponentNodeListener(vnode, eventName, handler);
    return;
  }
  addNativeNodeListener(vnode, eventName, handler);
}

export function getInputEventName (vnode: any, model: any) {
  if (isComponentVNode(vnode)) {
    const { event } = findModelConfig(vnode) || { event: 'input' };
    return event;
  }

  const data = getVNodeData(vnode);
  const attrs = data.attrs || data;
  const tag = vnode.type || vnode.tag;

  if ((model && model.modifiers && model.modifiers.lazy) || tag === 'select') {
    return 'change';
  }

  if (attrs && isTextInput({ type: attrs.type || 'text' } as HTMLInputElement)) {
    return 'input';
  }

  return 'change';
}

export function normalizeSlots (slots: Record<string, any>, ctx: any) {
  return Object.keys(slots).reduce((arr: any[], key: string) => {
    const slotContent = slots[key];
    const list = Array.isArray(slotContent) ? slotContent : [slotContent];
    list.forEach((vnode: any) => {
      if (vnode && !vnode.ctx && ctx) {
        vnode.ctx = ctx;
      }
    });
    return arr.concat(list);
  }, []);
}

export function createRenderless (h: Function, children: any) {
  if (Array.isArray(children) && children[0]) {
    return children[0];
  }
  if (children) {
    return children;
  }
  return h();
}

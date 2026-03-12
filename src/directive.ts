import { getCurrentInstance } from 'vue';
import Resolver from './core/resolver';
import Field from './core/field';
import Validator from './core/validatorDecorator';
import { isEqual, warn } from './utils';
import { getValidator } from './state';
import { resolveConfig } from './config';

/**
 * Vue 3 v-validate directive: registers fields with the component validator and handles lifecycle.
 */

/**
 * Returns the component instance that owns the element (Vue 3).
 * Prefers binding.instance; fallback to vnode.ctx or getCurrentInstance().
 *
 * @param {import('vue').VNode} vnode - Element vnode.
 * @param {import('vue').DirectiveBinding} binding - Directive binding.
 * @returns {import('vue').ComponentPublicInstance | null}
 */
function getContext (vnode, binding) {
  if (binding && binding.instance) return binding.instance;
  if (vnode && vnode.ctx) return vnode.ctx;
  const instance = getCurrentInstance();
  return instance ? instance.proxy : null;
}

/**
 * Returns the component that owns the element and has a validator; creates one if inject is enabled.
 *
 * @param {import('vue').VNode} vnode - Element vnode.
 * @param {import('vue').DirectiveBinding} binding - Directive binding.
 * @returns {ValidatingVM | null} Context with $validator or null.
 */
function getOrCreateValidator (vnode, binding) {
  const context = getContext(vnode, binding);
  if (!context) return null;

  if (context.$validator) return context;

  const base = getValidator();
  if (!base) return null;

  const options = resolveConfig(context);
  if (!options.inject) return null;

  context.$validator = new Validator(base, context);
  return context;
}

interface ValidatingVM {
  $validator?: any;
}

/**
 * Finds the Field instance for an element by its _formwardId.
 *
 * @param {HTMLElement & { _formwardId?: string }} el - Element with optional _formwardId.
 * @param {ValidatingVM | null} context - Component with $validator.
 * @returns {Field | null | undefined}
 */
function findField (el: HTMLElement & { _formwardId?: string }, context: ValidatingVM | null): Field | null | undefined {
  if (!context || !context.$validator) {
    return null;
  }
  return context.$validator.fields.findById(el._formwardId!);
}

/**
 * Vue 3 directive for v-validate. Registers fields with the component's validator and handles lifecycle.
 * Use as v-validate="'required|email'" or with modifiers (.immediate, .continues, etc.).
 */
export default {
  /**
   * Attaches a new field to the context's validator (beforeMount).
   *
   * @param {HTMLElement} el - Target element.
   * @param {import('vue').DirectiveBinding} binding - Binding (value = rules, modifiers).
   * @param {import('vue').VNode} vnode - Element vnode.
   */
  beforeMount (el: HTMLElement, binding, vnode) {
    const context = getOrCreateValidator(vnode, binding);
    const validator = context && context.$validator;
    if (!validator) {
      if (process.env.NODE_ENV !== 'production') {
        warn(`No validator instance is present on vm, did you forget to inject '$validator'?`);
      }

      return;
    }

    const fieldOptions = Resolver.generate(el, binding, vnode, context);
    validator.attach(fieldOptions);
  },
  /**
   * Updates field scope after mount if resolved scope differs.
   *
   * @param {HTMLElement} el - Target element.
   * @param {import('vue').DirectiveBinding} binding - Binding.
   * @param {import('vue').VNode} vnode - Element vnode.
   */
  mounted (el: HTMLElement, binding, vnode) {
    const context = getOrCreateValidator(vnode, binding);
    const field = findField(el, context);
    const scope = Resolver.resolveScope(el, binding, vnode);

    // skip if scope hasn't changed.
    if (!field || scope === field.scope) return;

    // only update scope.
    field.update({ scope });

    // allows the field to re-evaluated once more in the update hook.
    field.updated = false;
  },
  /**
   * Updates field scope and rules when binding value changes.
   *
   * @param {HTMLElement} el - Target element.
   * @param {import('vue').DirectiveBinding} binding - Binding.
   * @param {import('vue').VNode} vnode - Element vnode.
   */
  updated (el: HTMLElement, binding, vnode) {
    const context = getOrCreateValidator(vnode, binding);
    const field = findField(el, context);

    // make sure we don't do unneccasary work if no important change was done.
    if (!field || (field.updated && isEqual(binding.value, binding.oldValue))) return;
    const scope = Resolver.resolveScope(el, binding, vnode);
    const rules = Resolver.resolveRules(el, binding, vnode);

    field.update({
      scope,
      rules
    });
  },
  /**
   * Detaches the field from the validator on unmount.
   *
   * @param {HTMLElement} el - Target element.
   * @param {import('vue').DirectiveBinding} binding - Binding.
   * @param {import('vue').VNode} vnode - Element vnode.
   */
  unmounted (el: HTMLElement, binding, vnode) {
    const context = getOrCreateValidator(vnode, binding);
    const field = findField(el, context);
    if (!field) return;

    context.$validator.detach(field);
  }
};

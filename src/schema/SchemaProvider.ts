/**
 * SchemaProvider registers an object schema (Zod or Yup) as Formward rules for its children.
 * Use with the directive: v-validate="'schema:fieldName'" so fields are validated by the schema.
 */
import { defineComponent, inject, onMounted, onUnmounted, watch, type PropType } from 'vue';
import { installSchema } from './installSchema';

const FORMWARD_VALIDATOR_KEY = 'formward-validator';

export default defineComponent({
  name: 'SchemaProvider',
  props: {
    schema: {
      type: Object as PropType<unknown>,
      required: true
    },
    prefix: {
      type: String,
      default: 'schema'
    }
  },
  setup (props, { slots }) {
    const validator = inject<{ extend: (n: string, r: unknown, o?: unknown) => void; constructor: { remove: (n: string) => void } } | null>(FORMWARD_VALIDATOR_KEY, null);
    let cleanup: (() => void) | null = null;

    function install () {
      if (!validator) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[formward] SchemaProvider: formward-validator not found. Use app.use(Formward) before SchemaProvider.');
        }
        return;
      }
      if (cleanup) cleanup();
      cleanup = installSchema(validator, props.schema, { prefix: props.prefix });
    }

    onMounted(install);
    onUnmounted(() => {
      if (cleanup) cleanup();
      cleanup = null;
    });

    watch(() => [props.schema, props.prefix] as const, () => {
      install();
    }, { deep: true });

    return () => slots.default?.();
  }
});

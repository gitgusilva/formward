/**
 * Augment the typings of Vue.js (Vue 2 and Vue 3)
 */

import type { Validator, FormwardComponentOptions } from './formward.d';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $validator: Validator;
    $_formwardObserver?: unknown;
  }
}

declare module 'vue/types/options' {
  import type Vue from 'vue';
  interface ComponentOptions<V extends Vue> {
    $_formward?: FormwardComponentOptions;
  }
}

declare module 'vue/types/vue' {
  import type Vue from 'vue';
  interface Vue {
    $validator: Validator;
    $_formwardObserver?: unknown;
  }
}

import { ref, computed, nextTick, type Ref } from 'vue';

/**
 * Minimal validator interface for step validation by scope (directive API).
 * Use the validator from inject('formward-validator').
 */
export interface StepValidatorLike {
  validateAll(scopeOrValues?: string | Record<string, unknown>, opts?: { silent?: boolean }): Promise<boolean>;
}

/**
 * Instance shape we need from ValidationObserver (template ref).
 * Avoids depending on full component type.
 */
export interface StepObserverLike {
  validate(opts?: { silent?: boolean }): Promise<boolean>;
}

export interface UseStepValidationWithValidatorOptions {
  /** Validator instance (e.g. inject('formward-validator')). */
  validator: StepValidatorLike | null | undefined;
  /** Ref to the current step index (0-based). */
  currentStep: Ref<number>;
  /**
   * Map step index → scope name. Fields in each step must use that scope (e.g. data-vv-scope="step0").
   * With inject: true, use errors.first('email', 'step0') to show errors.
   */
  scopeByStep: Record<number, string>;
}

/**
 * Composable for step-by-step wizards: validates the current step before allowing advance.
 * Block the "Next" action until the current step has no validation errors.
 *
 * @param stepObserverRef - Template ref to the current step's ValidationObserver instance.
 *                          Use the same ref for all steps; with v-if per step, the ref will
 *                          point to the currently mounted observer.
 * @returns validateStep, isValidationPending, lastStepValid, canAdvance, resetState
 *
 * @example
 * ```vue
 * <template>
 *   <form @submit.prevent="handleNext">
 *     <!-- Step 0: same ref name, only one observer mounted at a time -->
 *     <ValidationObserver v-if="currentStep === 0" ref="stepObserverRef">
 *       <ValidationProvider name="email" rules="required|email" v-slot="{ errors }">
 *         <input v-model="email" />
 *         <span v-if="errors.length">{{ errors[0] }}</span>
 *       </ValidationProvider>
 *     </ValidationObserver>
 *
 *     <ValidationObserver v-else-if="currentStep === 1" ref="stepObserverRef">
 *       <ValidationProvider name="name" rules="required" v-slot="{ errors }">
 *         <input v-model="name" />
 *         <span v-if="errors.length">{{ errors[0] }}</span>
 *       </ValidationProvider>
 *     </ValidationObserver>
 *
 *     <button type="button" @click="prev" v-if="currentStep > 0">Voltar</button>
 *     <button type="submit" :disabled="isValidationPending">
 *       {{ isLastStep ? 'Enviar' : 'Próximo' }}
 *     </button>
 *   </form>
 * </template>
 *
 * <script setup>
 * import { ref, computed } from 'vue';
 * import { ValidationObserver, ValidationProvider, useStepValidation } from 'formward';
 *
 * const currentStep = ref(0);
 * const stepObserverRef = ref(null);
 * const { validateStep, isValidationPending } = useStepValidation(stepObserverRef);
 *
 * const email = ref('');
 * const name = ref('');
 * const isLastStep = computed(() => currentStep.value >= 1);
 *
 * async function handleNext() {
 *   if (isLastStep.value) {
 *     // submit final form
 *     return;
 *   }
 *   const valid = await validateStep();
 *   if (!valid) return; // blocks advance, errors stay visible
 *   currentStep.value++;
 * }
 *
 * function prev() {
 *   currentStep.value--;
 * }
 * </script>
 * ```
 */
export function useStepValidation(
  stepObserverRef: Ref<StepObserverLike | null | undefined>
) {
  const isValidationPending = ref(false);
  const lastStepValid = ref<boolean | null>(null);

  const canAdvance = computed(() => lastStepValid.value === true);

  /**
   * Validates the current step. Resolves to true if the step is valid and the user can advance.
   * Use this in your "Next" / "Continue" handler and only advance when it returns true.
   */
  async function validateStep(options?: { silent?: boolean }): Promise<boolean> {
    await nextTick();
    let observer = stepObserverRef.value;
    if (!observer) {
      await nextTick();
      observer = stepObserverRef.value;
    }
    if (!observer || typeof observer.validate !== 'function') {
      lastStepValid.value = false;
      return false;
    }

    isValidationPending.value = true;
    lastStepValid.value = null;
    try {
      const valid = await observer.validate(options ?? { silent: false });
      lastStepValid.value = valid;
      return valid;
    } finally {
      isValidationPending.value = false;
    }
  }

  /**
   * Resets the composable state (e.g. when moving to a new step). Does not reset the observer's validation state.
   */
  function resetState() {
    isValidationPending.value = false;
    lastStepValid.value = null;
  }

  return {
    validateStep,
    isValidationPending,
    lastStepValid,
    canAdvance,
    resetState
  };
}

/**
 * Composable for step-by-step wizards using the **directive API** (v-validate + data-vv-scope).
 * No ValidationObserver/ValidationProvider needed: use one scope per step and the injected validator.
 *
 * @param options.validator - From inject('formward-validator').
 * @param options.currentStep - Ref to current step index.
 * @param options.scopeByStep - Map step index → scope name (e.g. { 0: 'step0', 1: 'step1' }).
 * @returns Same as useStepValidation: validateStep, isValidationPending, lastStepValid, canAdvance, resetState.
 */
export function useStepValidationWithValidator(options: UseStepValidationWithValidatorOptions) {
  const { validator, currentStep, scopeByStep } = options;
  const isValidationPending = ref(false);
  const lastStepValid = ref<boolean | null>(null);

  const canAdvance = computed(() => lastStepValid.value === true);

  async function validateStep(opts?: { silent?: boolean }): Promise<boolean> {
    const v = validator;
    if (!v || typeof v.validateAll !== 'function') {
      lastStepValid.value = false;
      return false;
    }

    const scope = scopeByStep[currentStep.value];
    if (scope === undefined) {
      lastStepValid.value = false;
      return false;
    }

    isValidationPending.value = true;
    lastStepValid.value = null;
    try {
      const valid = await v.validateAll(scope, opts ?? { silent: false });
      lastStepValid.value = valid;
      return valid;
    } finally {
      isValidationPending.value = false;
    }
  }

  function resetState() {
    isValidationPending.value = false;
    lastStepValid.value = null;
  }

  return {
    validateStep,
    isValidationPending,
    lastStepValid,
    canAdvance,
    resetState
  };
}

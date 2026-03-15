# Wizard with directive and scope (multiple inputs per step)

Wizard using `v-validate`, one `data-vv-scope` per step, and `useStepValidationWithValidator`. Each step is a form section with multiple inputs; one scope wraps them all and `validateStep()` validates every field in that step.

```vue
<template>
  <form @submit.prevent="handleNext">
    <!-- Step 0: several inputs in one scope -->
    <div v-show="currentStep === 0" data-vv-scope="step0">
      <div>
        <input v-model="email" v-validate="'required|email'" name="email" />
        <span v-if="errors.has('email', 'step0')">{{ errors.first('email', 'step0') }}</span>
      </div>
      <div>
        <input v-model="name" v-validate="'required|min:2'" name="name" />
        <span v-if="errors.has('name', 'step0')">{{ errors.first('name', 'step0') }}</span>
      </div>
      <div>
        <input v-model="phone" v-validate="'required'" name="phone" />
        <span v-if="errors.has('phone', 'step0')">{{ errors.first('phone', 'step0') }}</span>
      </div>
    </div>

    <!-- Step 1: another set of inputs in step1 scope -->
    <div v-show="currentStep === 1" data-vv-scope="step1">
      <div>
        <input v-model="address" v-validate="'required'" name="address" />
        <span v-if="errors.has('address', 'step1')">{{ errors.first('address', 'step1') }}</span>
      </div>
      <div>
        <input v-model="city" v-validate="'required'" name="city" />
        <span v-if="errors.has('city', 'step1')">{{ errors.first('city', 'step1') }}</span>
      </div>
      <div>
        <input v-model="zip" v-validate="'required|digits:5'" name="zip" />
        <span v-if="errors.has('zip', 'step1')">{{ errors.first('zip', 'step1') }}</span>
      </div>
    </div>

    <button type="button" @click="prev" v-if="currentStep > 0">Back</button>
    <button type="submit" :disabled="isValidationPending">
      {{ isLastStep ? 'Submit' : 'Next' }}
    </button>
  </form>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useStepValidationWithValidator } from 'formward'

const validator = inject('formward-validator')
const currentStep = ref(0)
const scopeByStep = { 0: 'step0', 1: 'step1' }
const { validateStep, isValidationPending } = useStepValidationWithValidator({
  validator,
  currentStep,
  scopeByStep
})

const email = ref('')
const name = ref('')
const phone = ref('')
const address = ref('')
const city = ref('')
const zip = ref('')
const isLastStep = computed(() => currentStep.value >= 1)

async function handleNext() {
  if (isLastStep.value) return
  const valid = await validateStep()
  if (!valid) return
  currentStep.value++
}

function prev() {
  currentStep.value--
}
</script>
```

**Composable:** `useStepValidationWithValidator({ validator, currentStep, scopeByStep })` — returns `validateStep()`, `isValidationPending`, `lastStepValid`, `canAdvance`, `resetState()`. Call `validateStep()` before advancing; only advance when it returns `true`. Plugin must be installed with `inject: true`.

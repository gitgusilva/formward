# Wizard with ValidationObserver and ValidationProvider (multiple inputs per step)

Wizard using one `ValidationObserver` per step and `useStepValidation`. Each step has multiple fields; one observer wraps the whole step and validates every `ValidationProvider` inside before allowing advance.

```vue
<template>
  <form @submit.prevent="handleNext">
    <!-- Step 0: one observer for all fields in this step -->
    <ValidationObserver v-if="currentStep === 0" ref="stepObserverRef">
      <ValidationProvider name="email" rules="required|email" v-slot="{ errors }">
        <input v-model="email" />
        <span v-if="errors.length">{{ errors[0] }}</span>
      </ValidationProvider>
      <ValidationProvider name="name" rules="required|min:2" v-slot="{ errors }">
        <input v-model="name" />
        <span v-if="errors.length">{{ errors[0] }}</span>
      </ValidationProvider>
      <ValidationProvider name="phone" rules="required" v-slot="{ errors }">
        <input v-model="phone" />
        <span v-if="errors.length">{{ errors[0] }}</span>
      </ValidationProvider>
    </ValidationObserver>

    <!-- Step 1: another observer for this step's fields -->
    <ValidationObserver v-else-if="currentStep === 1" ref="stepObserverRef">
      <ValidationProvider name="address" rules="required" v-slot="{ errors }">
        <input v-model="address" />
        <span v-if="errors.length">{{ errors[0] }}</span>
      </ValidationProvider>
      <ValidationProvider name="city" rules="required" v-slot="{ errors }">
        <input v-model="city" />
        <span v-if="errors.length">{{ errors[0] }}</span>
      </ValidationProvider>
      <ValidationProvider name="zip" rules="required|digits:5" v-slot="{ errors }">
        <input v-model="zip" />
        <span v-if="errors.length">{{ errors[0] }}</span>
      </ValidationProvider>
    </ValidationObserver>

    <button type="button" @click="prev" v-if="currentStep > 0">Back</button>
    <button type="submit" :disabled="isValidationPending">
      {{ isLastStep ? 'Submit' : 'Next' }}
    </button>
  </form>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ValidationObserver, ValidationProvider, useStepValidation } from 'formward'

const currentStep = ref(0)
const stepObserverRef = ref(null)
const { validateStep, isValidationPending } = useStepValidation(stepObserverRef)

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

**Composable:** `useStepValidation(stepObserverRef)` — returns `validateStep()`, `isValidationPending`, `lastStepValid`, `canAdvance`, `resetState()`. Use the same ref on each step’s `ValidationObserver` (only one is mounted at a time).

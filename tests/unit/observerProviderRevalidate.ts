/**
 * Integration-style tests for ValidationObserver + ValidationProvider (test-app test 2 & 3).
 * Verifies: after observer.validate() shows errors, correcting values and re-validating
 * (via provider.validate() with no args, which syncs from DOM) clears errors and enables the button.
 * In the real app the same path is triggered by the input handler (event/DOM sync in debounced handler).
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import Formward from '@/index';
import flushPromises from 'flush-promises';

const ValidationProvider = Formward.ValidationProvider;
const ValidationObserver = Formward.ValidationObserver;

function mountObserverProviderTest () {
  const Comp = {
    setup () {
      const formObserver = ref(null);
      const login = ref('');
      const age = ref('');
      return { formObserver, login, age };
    },
    template: `
      <ValidationObserver ref="formObserver" v-slot="{ invalid }">
        <form class="form" @submit.prevent>
          <ValidationProvider name="login" rules="required|min:3" v-slot="{ errors }">
            <input v-model="login" placeholder="Login" data-test="login" />
            <span v-if="errors.length" class="error" data-test="login-error">{{ errors[0] }}</span>
          </ValidationProvider>
          <ValidationProvider name="age" rules="required|min_value:18" v-slot="{ errors }">
            <input v-model.number="age" type="number" placeholder="Age" data-test="age" />
            <span v-if="errors.length" class="error" data-test="age-error">{{ errors[0] }}</span>
          </ValidationProvider>
          <button type="submit" :disabled="invalid" data-test="submit">Submit</button>
        </form>
      </ValidationObserver>
    `,
    components: { ValidationObserver, ValidationProvider }
  };
  return mount(Comp, {
    global: {
      plugins: [Formward],
      components: { ValidationObserver, ValidationProvider }
    }
  });
}

describe('Observer + Provider revalidation (test-app test 2)', () => {
  it('after validation with errors, correcting values re-validates and enables submit', async () => {
    const wrapper = mountObserverProviderTest();
    await flushPromises();

    const loginInput = wrapper.find('[data-test="login"]');
    const ageInput = wrapper.find('[data-test="age"]');
    const submitBtn = wrapper.find('[data-test="submit"]');

    // Set invalid values and trigger validation via observer (like submit in the app)
    await loginInput.setValue('ab');
    await ageInput.setValue('10');
    await flushPromises();
    const observer = wrapper.findComponent(ValidationObserver);
    await observer.vm.validate();
    await flushPromises();

    expect(wrapper.find('[data-test="login-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="age-error"]').exists()).toBe(true);
    expect(submitBtn.attributes('disabled')).toBeDefined();

    // Correct values in DOM; validate() without args syncs from DOM and re-validates (same path as input handler)
    await loginInput.setValue('abc');
    await ageInput.setValue('18');
    await flushPromises();
    const providers = wrapper.findAllComponents(ValidationProvider);
    await providers[0].vm.validate(); // no args: syncValueFromElement + validate
    await providers[1].vm.validate();
    await flushPromises();
    expect(wrapper.find('[data-test="login-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="age-error"]').exists()).toBe(false);
    expect(submitBtn.attributes('disabled')).toBeUndefined();
  });
});

describe('Observer + Provider revalidation (test-app test 3 - wizard step)', () => {
  it('wizard step: invalid → correct fields → invalid becomes false and button enables', async () => {
    const email = ref('');
    const name = ref('');
    const Comp = {
      setup () {
        const observerRef = ref(null);
        return { observerRef, email, name };
      },
      template: `
        <ValidationObserver ref="observerRef" v-slot="{ invalid }">
          <ValidationProvider name="wizard_email" rules="required|email" v-slot="{ errors }">
            <input v-model="email" type="email" data-test="email" />
            <span v-if="errors.length" class="error" data-test="email-error">{{ errors[0] }}</span>
          </ValidationProvider>
          <ValidationProvider name="wizard_name" rules="required|min:2" v-slot="{ errors }">
            <input v-model="name" data-test="name" />
            <span v-if="errors.length" class="error" data-test="name-error">{{ errors[0] }}</span>
          </ValidationProvider>
          <button :disabled="invalid" data-test="next">Next</button>
        </ValidationObserver>
      `,
      components: { ValidationObserver, ValidationProvider }
    };
    const wrapper = mount(Comp, {
      global: {
        plugins: [Formward],
        components: { ValidationObserver, ValidationProvider }
      }
    });
    await flushPromises();

    const emailInput = wrapper.find('[data-test="email"]');
    const nameInput = wrapper.find('[data-test="name"]');
    const nextBtn = wrapper.find('[data-test="next"]');

    // Force validation with invalid values (like clicking Next in the app)
    await emailInput.setValue('x');
    await nameInput.setValue('a');
    await flushPromises();
    const observer = wrapper.findComponent(ValidationObserver);
    await observer.vm.validate();
    await flushPromises();
    expect(wrapper.find('[data-test="email-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="name-error"]').exists()).toBe(true);

    // Correct values; validate() without args syncs from DOM and re-validates
    await emailInput.setValue('a@b.com');
    await nameInput.setValue('ab');
    await flushPromises();
    const providers = wrapper.findAllComponents(ValidationProvider);
    await providers[0].vm.validate();
    await providers[1].vm.validate();
    await flushPromises();
    expect(wrapper.find('[data-test="email-error"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="name-error"]').exists()).toBe(false);
    expect(nextBtn.attributes('disabled')).toBeUndefined();
  });
});

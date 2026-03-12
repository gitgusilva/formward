import { shallow, createLocalVue } from '@vue/test-utils';
import Formward from '@/index';
import TestComponent from './components/Validity';

const Vue = createLocalVue();
Vue.use(Formward, {
  validity: true
});

test('sets HTML contstrained validation API messages', async () => {
  const wrapper = shallow(TestComponent, { localVue: Vue });
  const input = wrapper.find('input');
  input.element.value = 'not an email';
  input.element.setCustomValidity = vi.fn();
  await wrapper.vm.$validator.validate();
  expect(input.element.setCustomValidity).toHaveBeenCalledTimes(1);
  expect(input.element.setCustomValidity).toHaveBeenLastCalledWith(
    wrapper.vm.$validator.errors.first('email')
  );
});

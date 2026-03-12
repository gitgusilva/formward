<template>
  <input :name="name" :value="value" type="text" @input="$emit('input', $event.target.value)" @blur="$emit('blur', $event.target.value)">
</template>

<script>
export default {
  name: 'custom-input-component',
  $_formward: {
    // value resolver
    value () {
      return this.$el.value;
    },
    // name resolver
    name () {
      return this.someProp;
    }
  },
  props: {
    name: String,
    value: null,
    someProp: null
  }
};
</script>

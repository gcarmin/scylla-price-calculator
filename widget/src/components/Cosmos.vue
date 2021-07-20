<template>
  <div class="pricing" id="cosmos">
    <template v-for="price in prices" :key="price.id">
      <div>
        <div class="price-name text-capitalize">{{ price.name }}</div>
        <div class="price__wrapper">
          <div class="price d-flex align-items-baseline">
            <small>$</small>{{formatPrice(price.total)}}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {Cosmos} from '../Calculator'
import {CalcCommons} from '../CalcMixin'

export default {
  mixins: [CalcCommons],
  props: ['workload'],
  computed: {
    prices: (vm: Vue.DefineComponent) => {
      const _prices = Cosmos.prices(vm.workload)

      vm.$emit('update:modelValue', _prices)
      return _prices
    }
  }
}
</script>

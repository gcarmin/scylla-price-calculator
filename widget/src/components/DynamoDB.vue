<template>
  <div class="pricing" id="dynamodb">
    <div v-for="price in prices" :key="price.id">
      <div class="price-name text-capitalize">
        {{ price.name }}
        <div class="font-weight-light d-inline-block">
          {{ price.subname }}
        </div>
      </div>
      <div class="price__wrapper">
        <div class="price d-flex align-items-baseline">
          <small>$</small>{{formatPrice(price.total)}}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {DynamoDB} from 'scylla-price-calculator-lib'
import {CalcCommons} from '../CalcMixin'

export default {
  mixins: [CalcCommons],
  props: {
    workload: {
      type: Object
    }
  },
  computed: {
    prices: (vm: Vue.DefineComponent) => {
      const _prices = DynamoDB.prices(vm.workload)
      vm.$emit('update:modelValue', _prices)

      return _prices
    }
  }
}
</script>

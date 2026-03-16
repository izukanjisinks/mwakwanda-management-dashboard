<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import AdminDashboard from '@/components/dashboard/AdminDashboard.vue'
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard.vue'

const authStore = useAuthStore()

const isAdmin = computed(() => {
  const role = authStore.userRole
  return role === 'super_admin' || role === 'hr_manager'
})
</script>

<template>
  <AdminDashboard v-if="isAdmin" />
  <EmployeeDashboard v-else />
</template>

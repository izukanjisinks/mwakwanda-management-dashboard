<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { useBackofficeStore } from '@/stores/backoffice'
import { consumeSessionExpiredFlag } from '@/services/api/sessionExpiry'
import { Loader2, Lock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const router = useRouter()
const route = useRoute()
const store = useBackofficeStore()

const form = ref({ email: '', password: '' })

onMounted(() => {
  if (consumeSessionExpiredFlag()) {
    toast.error('Your session has expired. Please sign in again.')
  }
})

async function handleSubmit() {
  const ok = await store.login(form.value.email, form.value.password)
  if (ok) {
    const redirect = route.query.redirect as string | undefined
    router.push(redirect ?? { name: 'backoffice-dashboard' })
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="w-full max-w-md">
      <div class="rounded-2xl border border-border/40 bg-card/70 p-8 shadow-2xl shadow-primary/5 backdrop-blur-xl">
        <div class="flex flex-col items-center gap-3 text-center mb-8">
          <div class="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Lock class="size-6 text-primary" />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight">LodgeCentral Backoffice</h1>
            <p class="mt-1 text-sm text-muted-foreground">Platform administrator access only.</p>
          </div>
        </div>

        <div v-if="store.error" class="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p class="text-sm text-destructive text-center">{{ store.error }}</p>
        </div>

        <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
          <div class="grid gap-2">
            <Label for="email">Email address</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="admin@lodgecentral.io"
              required
              autocomplete="email"
            />
          </div>

          <div class="grid gap-2">
            <Label for="password">Password</Label>
            <Input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="Enter your password"
              required
              autocomplete="current-password"
            />
          </div>

          <Button type="submit" :disabled="store.loading" class="mt-2 h-11 w-full">
            <Loader2 v-if="store.loading" class="size-4 animate-spin mr-2" />
            Sign in to Backoffice
          </Button>
        </form>
      </div>

      <p class="mt-6 text-center text-xs text-muted-foreground">
        Restricted to authorised platform administrators.
      </p>
    </div>
  </div>
</template>

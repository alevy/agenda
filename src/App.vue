<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useBzrStore } from './stores/bzr.ts'

const store = useBzrStore()
</script>

<template>
  <header>
    <h1>Agenda</h1>
    <template v-if="!store.isLoggedIn">
      <button @click="store.login">Log in or create account</button>
    </template>
    <template v-else>
      <button @click="store.logOut">Log out</button>
    </template>
  </header>
  <RouterView v-if="store.isLoggedIn" />
</template>

<style scoped></style>

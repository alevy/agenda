import { ref } from 'vue'
import { defineStore } from 'pinia'
import { BazaarApp } from '@bzr/bazaar'

const bzr = new BazaarApp({
  appId: import.meta.env.VITE_APP_ID || 'test',
  loginRedirectUri: import.meta.env.VITE_URL || window.location.href,
  onApiConnectError: async (bzr) => bzr.logOut(),
})

const isLoggedIn = ref(bzr.isLoggedIn())

bzr.onLogin(async (bzr: BazaarApp) => {
  isLoggedIn.value = true
})

export const useBzrStore = defineStore('bazaar', {
  actions: {
    login() {
      bzr.login()
    },
    logOut() {
      bzr.logOut()
    },
  },

  state: () => {
    return { bzr, isLoggedIn }
  },
})

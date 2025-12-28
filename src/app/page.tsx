'use client'

import { StoreProvider } from '@/store/store-context'
import { MainLayout } from '@/components/layout/main-layout'

export default function Home() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  )
}

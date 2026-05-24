/// <reference types="vite/client" />

interface Window {
  api: {
    auth: {
      register: (data: { email: string; password: string; name: string }) => Promise<{ message: string; devAutoVerified?: boolean }>
      login: (data: { email: string; password: string }) => Promise<{
        token: string
        refreshToken: string
        user: { id: string; email: string; name: string | null }
      }>
      logout: () => Promise<{ success: boolean }>
      getSession: () => Promise<{
        token: string
        refreshToken: string
        user: { id: string; email: string; name: string | null }
      } | null>
      verifyEmail: (email: string, code: string) => Promise<{ success: boolean }>
      resendVerification: (email: string) => Promise<{ success: boolean }>
      forgotPassword: (email: string) => Promise<{ message: string }>
      resetPassword: (data: { email: string; code: string; password: string }) => Promise<{ message: string }>
      getSubscriptionStatus: () => Promise<{
        access: 'trialing' | 'active' | 'expired' | 'past_due' | 'offline' | 'unauthenticated'
        daysRemaining?: number
        plan?: string
        cached?: boolean
      }>
      createCheckout: (plan: 'monthly' | 'yearly') => Promise<{ success: boolean }>
      openBillingPortal: () => Promise<{ success: boolean }>
      changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<{ message: string }>
    }
    projects: {
      list: () => Promise<Array<{
        id: string
        name: string
        clientName: string | null
        url: string | null
        description: string | null
        status: string
        standards: string | null
        auditUrls: string[]
        components: string[]
        clientLogoPath: string | null
        createdAt: number
        updatedAt: number
        findingCount: number
      }>>
      get: (id: string) => Promise<{
        id: string
        name: string
        clientName: string | null
        url: string | null
        description: string | null
        status: string
        standards: string | null
        auditUrls: string[]
        components: string[]
        clientLogoPath: string | null
        createdAt: number
        updatedAt: number
      }>
      create: (data: {
        name: string
        clientName?: string
        url?: string
        description?: string
        standards?: string
        auditUrls?: string[]
        components?: string[]
        clientLogoPath?: string
      }) => Promise<{
        id: string; name: string; clientName: string | null; url: string | null
        description: string | null; status: string; standards: string | null
        auditUrls: string[]; components: string[]; clientLogoPath: string | null
        createdAt: number; updatedAt: number
      }>
      update: (id: string, data: {
        name?: string; clientName?: string; url?: string; description?: string
        status?: string; standards?: string; auditUrls?: string[]; components?: string[]
        clientLogoPath?: string | null
      }) => Promise<{
        id: string; name: string; clientName: string | null; url: string | null
        description: string | null; status: string; standards: string | null
        auditUrls: string[]; components: string[]; clientLogoPath: string | null
        createdAt: number; updatedAt: number
      }>
      delete: (id: string) => Promise<{ success: boolean }>
    }
    findings: {
      list: (projectId: string) => Promise<Array<{
        id: string
        projectId: string
        title: string
        description: string | null
        wcagCriterion: string | null
        wcagLevel: string | null
        standards: string | null
        category: string | null
        severity: string | null
        status: string | null
        pageUrl: string | null
        component: string | null
        screenshotPath: string | null
        recommendations: string | null
        notes: string | null
        createdAt: number
        updatedAt: number
      }>>
      get: (id: string) => Promise<unknown>
      create: (data: {
        projectId: string
        title: string
        description?: string
        wcagCriterion?: string
        wcagLevel?: string
        standards?: string[]
        category?: string
        severity?: string
        status?: string
        pageUrl?: string
        component?: string
        screenshotPath?: string
        recommendations?: string
        notes?: string
      }) => Promise<unknown>
      update: (id: string, data: Record<string, unknown>) => Promise<unknown>
      delete: (id: string) => Promise<{ success: boolean }>
      addScreenshot: (findingId: string, sourcePath: string) => Promise<{ path: string }>
    }
    templates: {
      list: () => Promise<Array<{
        id: string
        title: string
        description: string | null
        wcagCriterion: string | null
        wcagLevel: string | null
        standards: string[]
        category: string | null
        severity: string | null
        recommendations: string | null
        notes: string | null
        createdAt: number
        updatedAt: number
      }>>
      create: (data: {
        title: string
        description?: string
        wcagCriterion?: string
        wcagLevel?: string
        standards?: string[]
        category?: string
        severity?: string
        recommendations?: string
        notes?: string
      }) => Promise<unknown>
      update: (id: string, data: Record<string, unknown>) => Promise<unknown>
      delete: (id: string) => Promise<{ success: boolean }>
    }
    export: {
      pdf: (projectId: string, format?: 'summary' | 'vpat', auditState?: { criteriaVerdict: Record<string, 'pass' | 'fail'>; criteriaProgress: Partial<Record<string, 'complete'>> }) => Promise<{ success?: boolean; path?: string; canceled?: boolean }>
      csv: (projectId: string) => Promise<{ success?: boolean; path?: string; canceled?: boolean }>
      chooseScreenshot: () => Promise<string | null>
    }
    update: {
      onAvailable: (cb: () => void) => void
      onReady: (cb: () => void) => void
      install: () => Promise<void>
    }
    import: {
      chooseFile: () => Promise<string | null>
      parseFile: (filePath: string) => Promise<{
        pageTitle: string
        pageUrl: string
        findings: Array<{
          previewId: string
          issueType: 'Violation' | 'Needs review' | 'Recommendation'
          title: string
          wcagCriterion: string
          wcagCriterionName: string
          wcagLevel: string
          category: string
          severity: 'critical' | 'serious' | 'moderate' | 'minor'
          status: 'open' | 'needs_review'
          pageUrl: string
          pageTitle: string
          description: string
          instanceCount: number
          elements: string[]
        }>
        skipped: number
      }>
      importFindings: (projectId: string, findings: unknown[]) => Promise<{ imported: number }>
    }
    system: {
      openFile: (filePath: string) => Promise<{ success: boolean }>
      quit: () => Promise<void>
      saveClipboardImage: (base64: string) => Promise<string>
      readClipboardImage: () => Promise<string | null>
    }
  }
}

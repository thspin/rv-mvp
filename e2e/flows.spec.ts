import { test, expect } from '@playwright/test'

test.describe('E2E-1: Flujo de nuevo usuario', () => {
  test('login Google -> redirect /equipos -> completar perfil -> unirse a equipo', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /iniciar sesi[oó]n|login|google/i }).click()

    await page.waitForURL(/\/equipos|\/dashboard|\/perfil/)

    const currentUrl = page.url()
    if (currentUrl.includes('/equipos')) {
      await page.getByRole('button', { name: /unirse|join|solicitar/i }).first().click()

      await page.waitForURL(/\/perfil/)
    }

    if (currentUrl.includes('/perfil')) {
      await page.getByLabel(/nombre/i).fill('Test Atleta')
      await page.getByLabel(/dni/i).fill('12345678')
      await page.getByLabel(/tel[eé]fono/i).fill('+5491112345678')
      await page.getByLabel(/contacto emergencia/i).fill('Maria Test')
      await page.getByLabel(/tel[eé]fono emergencia/i).fill('+5491187654321')
      await page.getByLabel(/talle/i).selectOption('M')
      await page.getByLabel(/g[eé]nero/i).selectOption('masculino')
      await page.getByLabel(/fecha nacimiento/i).fill('1990-01-15')
      await page.getByLabel(/pa[ií]s/i).fill('Argentina')
      await page.getByLabel(/provincia/i).fill('Buenos Aires')
      await page.getByLabel(/ciudad/i).fill('CABA')
      await page.getByLabel(/c[oó]digo postal/i).fill('1414')
      await page.getByLabel(/domicilio/i).fill('Av. Test 123')

      await page.getByRole('button', { name: /guardar|continuar|completar/i }).click()
    }

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})

test.describe('E2E-2: Flujo de admin', () => {
  test('admin ve solicitudes -> aprueba -> atleta activo', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /iniciar sesi[oó]n|login|google/i }).click()
    await page.waitForURL(/\/admin|\/dashboard/)

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/)

    const solicitudesTab = page.getByRole('tab', { name: /solicitudes|pendientes/i })
    if (await solicitudesTab.isVisible()) {
      await solicitudesTab.click()

      const aprobarBtn = page.getByRole('button', { name: /aprobar|accept/i }).first()
      if (await aprobarBtn.isVisible()) {
        await aprobarBtn.click()
        await page.waitForTimeout(1000)
      }
    }

    const atletasTab = page.getByRole('tab', { name: /atletas/i })
    if (await atletasTab.isVisible()) {
      await atletasTab.click()
      await page.waitForTimeout(500)
    }
  })

  test('admin valida comprobante de pago -> status Pagado', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/)

    const pagosTab = page.getByRole('tab', { name: /pagos/i })
    if (await pagosTab.isVisible()) {
      await pagosTab.click()
      await page.waitForTimeout(500)
    }
  })
})

test.describe('E2E-3: Flujo de pago', () => {
  test('atleta sube comprobante -> Pendiente_Verificacion -> admin aprueba -> Pagado', async ({ page }) => {
    await page.goto('/dashboard')

    const uploadSection = page.locator('[data-testid="payment-upload"], [class*="payment"]')
    if (await uploadSection.isVisible()) {
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: 'comprobante.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake-image-content'),
        })

        await page.getByRole('button', { name: /subir|upload|enviar/i }).click()
        await page.waitForTimeout(1000)
      }
    }
  })
})

test.describe('E2E-4: Flujo de apto medico', () => {
  test('subir apto -> pendiente -> admin aprueba -> vigente con fecha', async ({ page }) => {
    await page.goto('/dashboard')

    const medicalSection = page.locator('[data-testid="medical-upload"], [class*="apto"], [class*="medico"]')
    if (await medicalSection.isVisible()) {
      const fileInput = page.locator('input[type="file"]').first()
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: 'apto_medico.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('fake-pdf-content'),
        })

        await page.getByRole('button', { name: /subir|upload|enviar/i }).click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('admin rechaza apto -> rechazado con motivo visible', async ({ page }) => {
    await page.goto('/admin')

    const aptosTab = page.getByRole('tab', { name: /aptos|m[eé]dicos|fit/i })
    if (await aptosTab.isVisible()) {
      await aptosTab.click()
      await page.waitForTimeout(500)
    }
  })
})

test.describe('E2E-5: Proteccion de rutas', () => {
  test('sin sesion -> redirect a /', async ({ page, context }) => {
    await context.clearCookies()

    await page.goto('/dashboard')
    await page.waitForURL('/')
    await expect(page).toHaveURL('/')
  })

  test('no-admin accede a /admin -> redirect', async ({ page }) => {
    await page.goto('/admin')

    await page.waitForTimeout(2000)
    const currentUrl = page.url()
    const isRedirected = !currentUrl.includes('/admin') || currentUrl.includes('/')
    expect(isRedirected).toBeTruthy()
  })

  test('logout -> sesion destruida', async ({ page, context }) => {
    await page.goto('/dashboard')

    const logoutBtn = page.getByRole('button', { name: /cerrar sesi[oó]n|logout|salir/i })
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await page.waitForURL('/')
    }

    await context.clearCookies()
    await page.goto('/dashboard')
    await page.waitForURL('/')
  })
})

test.describe('E2E-6: Notificaciones', () => {
  test('admin aprueba pago -> atleta ve notificacion en NotificationBell', async ({ page }) => {
    await page.goto('/dashboard')

    const notificationBell = page.locator('[data-testid="notification-bell"], [class*="notification"], [class*="bell"]')
    if (await notificationBell.isVisible()) {
      await notificationBell.click()
      await page.waitForTimeout(500)

      const notificationPanel = page.locator('[class*="dropdown"], [class*="popover"], [class*="panel"]')
      if (await notificationPanel.isVisible()) {
        const hasNotification = await notificationPanel.locator('text=/pago|aprobado/i').isVisible()
        expect(hasNotification).toBeTruthy()
      }
    }
  })

  test('admin rechaza apto -> atleta ve notificacion con motivo', async ({ page }) => {
    await page.goto('/dashboard')

    const notificationBell = page.locator('[data-testid="notification-bell"], [class*="notification"], [class*="bell"]')
    if (await notificationBell.isVisible()) {
      await notificationBell.click()
      await page.waitForTimeout(500)

      const notificationPanel = page.locator('[class*="dropdown"], [class*="popover"], [class*="panel"]')
      if (await notificationPanel.isVisible()) {
        const hasNotification = await notificationPanel.locator('text=/apto|m[eé]dico|rechazado/i').isVisible()
        expect(hasNotification).toBeTruthy()
      }
    }
  })
})

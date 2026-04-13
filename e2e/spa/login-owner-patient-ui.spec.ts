import { test, expect } from './fixtures/spa-fixture';

/**
 * SPA E2E — Login Real + Criação de Owner/Patient via UI
 *
 * Fluxo validado:
 * 1. Login real via formulário da SPA (email/senha)
 * 2. Criação de tutor via UI com validação na lista
 * 3. Criação de paciente via UI com SearchSelect
 * 4. Validação de relacionamento owner-patient
 * 5. Teste de erro de login
 * 6. Validação de campos obrigatórios
 *
 * Execução:
 *   npx playwright test --config playwright-spa.config.ts -g "Login Real"
 */

const SPA_URL = process.env.SPA_URL || 'http://localhost:3102';

test.describe('Login Real + Owner/Patient via UI', () => {
  test('faz login real na SPA, cria tutor e paciente pela interface', async ({
    page,
    loginViaUI,
    createOwnerViaUI,
    createPatientViaUI,
    cleanup,
    apiCall
  }) => {
    const timestamp = Date.now();
    const ownerName = `Tutor UI ${timestamp}`;
    const patientName = `Paciente UI ${timestamp}`;

    // ── Step 1: Real UI Login ──
    console.log('   🔐 Logging in via real UI...');
    await loginViaUI();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    console.log(`   ✅ Logged in, redirected to: ${new URL(page.url()).pathname}`);

    // Verify authenticated page loaded — use heading role for robustness
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Authenticated page loaded');

    // ── Step 2: Create Owner via UI ──
    console.log(`   👤 Creating owner "${ownerName}" via UI...`);
    const ownerId = await createOwnerViaUI({
      fullName: ownerName,
      documentId: `UI-DOC-${timestamp}`,
      phone: '11988887777'
    });
    expect(ownerId).toBeTruthy();
    cleanup.track({ type: 'owner', id: ownerId });
    console.log(`   ✅ Owner created: ${ownerId}`);

    // Verify owner appears in the list
    console.log('   🔍 Verifying owner in list...');
    await page.goto(`${SPA_URL}/owners`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(ownerName)).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Owner visible in list');

    // ── Step 3: Create Patient via UI ──
    console.log(`   🐾 Creating patient "${patientName}" via UI...`);
    const patientId = await createPatientViaUI({
      name: patientName,
      species: 'canine',
      sex: 'male',
      ownerName: ownerName,
      breed: 'Golden Retriever'
    });
    expect(patientId).toBeTruthy();
    cleanup.track({ type: 'patient', id: patientId });
    console.log(`   ✅ Patient created: ${patientId}`);

    // Verify patient appears in the list
    console.log('   🔍 Verifying patient in list...');
    await page.goto(`${SPA_URL}/patients`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(patientName)).toBeVisible({ timeout: 15000 });
    console.log('   ✅ Patient visible in list');

    // ── Step 4: Verify owner-patient relationship ──
    console.log('   🔗 Verifying owner-patient relationship...');
    await page.goto(`${SPA_URL}/patients/${patientId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('main').getByText(ownerName).first()).toBeVisible({
      timeout: 10000
    });
    console.log('   ✅ Patient detail shows correct owner');

    console.log('   🎉 Login + Owner + Patient UI flow completed!');
  });

  test('validates login error with wrong credentials', async ({ page }) => {
    console.log('   🔐 Testing login with wrong credentials...');

    await page.context().clearCookies();
    await page.goto(`${SPA_URL}/`);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${SPA_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Wait for error message — use role="alert" as primary selector (accessibility)
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    console.log('   ✅ Login error displayed for wrong credentials');

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    console.log('   ✅ User remains on login page after failed login');
  });

  test('validates owner form required fields', async ({ page, loginViaUI }) => {
    console.log('   📝 Testing owner form validation...');

    await loginViaUI();
    await page.goto(`${SPA_URL}/owners/new`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#fullName')).toHaveJSProperty('required', true);
    await expect(page.locator('#fullName')).toHaveValue('');
    await expect(page.locator('#contact-value-0')).toHaveValue('');

    const ownerRequiredState = await page.evaluate(() => {
      const fullName = document.querySelector('#fullName') as HTMLInputElement | null;
      const contactValue = document.querySelector('#contact-value-0') as HTMLInputElement | null;
      return {
        fullNameInvalid: fullName ? !fullName.checkValidity() : false,
        contactInvalid: contactValue ? !contactValue.checkValidity() : false
      };
    });

    expect(ownerRequiredState.fullNameInvalid).toBe(true);
    expect(ownerRequiredState.contactInvalid).toBe(false);
    await expect(page).toHaveURL(/\/owners\/new$/, { timeout: 5000 });
    console.log('   ✅ Owner form exposes required-field invalid state before submission');
  });

  test('validates patient form required fields', async ({ page, loginViaUI }) => {
    console.log('   📝 Testing patient form validation...');

    await loginViaUI();
    await page.goto(`${SPA_URL}/patients/new`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#name')).toHaveJSProperty('required', true);
    await expect(page.locator('#species')).toHaveJSProperty('required', true);
    await expect(page.locator('#sex')).toHaveJSProperty('required', true);

    const patientRequiredState = await page.evaluate(() => {
      const name = document.querySelector('#name') as HTMLInputElement | null;
      const species = document.querySelector('#species') as HTMLSelectElement | null;
      const sex = document.querySelector('#sex') as HTMLSelectElement | null;
      return {
        nameInvalid: name ? !name.checkValidity() : false,
        speciesInvalid: species ? !species.checkValidity() : false,
        sexInvalid: sex ? !sex.checkValidity() : false
      };
    });

    expect(patientRequiredState.nameInvalid).toBe(true);
    expect(patientRequiredState.speciesInvalid).toBe(true);
    expect(patientRequiredState.sexInvalid).toBe(true);
    await expect(page.getByPlaceholder('Buscar tutor por nome...')).toHaveValue('');
    await expect(page).toHaveURL(/\/patients\/new$/, { timeout: 5000 });
    console.log('   ✅ Patient form exposes required-field invalid state before submission');
  });
});

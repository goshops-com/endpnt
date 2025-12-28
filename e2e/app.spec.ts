import { test, expect } from '@playwright/test'

test.describe('Endpnt App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load the main page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Endpnt' })).toBeVisible()
    await expect(page.getByText('Collections')).toBeVisible()
  })

  test('should show empty collections state', async ({ page }) => {
    await expect(page.getByText('No collections yet')).toBeVisible()
    await expect(page.getByText('Create your first collection')).toBeVisible()
  })

  test('should create a new collection', async ({ page }) => {
    // Click the add collection button
    await page.getByRole('button', { name: /plus/i }).first().click()

    // Fill in the collection details
    await page.getByPlaceholder('My Collection').fill('Test API Collection')
    await page.getByPlaceholder('Description of this collection').fill('A test collection for E2E tests')

    // Submit
    await page.getByRole('button', { name: 'Create' }).click()

    // Verify the collection appears in the sidebar
    await expect(page.getByText('Test API Collection')).toBeVisible()
  })

  test('should create and edit a request', async ({ page }) => {
    // First create a collection
    await page.getByRole('button', { name: /plus/i }).first().click()
    await page.getByPlaceholder('My Collection').fill('My API')
    await page.getByRole('button', { name: 'Create' }).click()

    // Wait for collection to appear
    await expect(page.getByText('My API')).toBeVisible()

    // Add a request to the collection
    await page.getByText('My API').hover()
    await page.getByRole('button', { name: /more/i }).first().click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    // Verify request builder is visible
    await expect(page.getByPlaceholder('Request name')).toBeVisible()

    // Edit the request name
    await page.getByPlaceholder('Request name').fill('Get Users')

    // Enter a URL
    await page.getByPlaceholder('Enter request URL').fill('https://jsonplaceholder.typicode.com/users')

    // Verify the request appears in sidebar
    await expect(page.getByText('Get Users')).toBeVisible()
  })

  test('should send a GET request and display response', async ({ page }) => {
    // Create a collection and request
    await page.getByRole('button', { name: /plus/i }).first().click()
    await page.getByPlaceholder('My Collection').fill('JSONPlaceholder')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('JSONPlaceholder').hover()
    await page.getByRole('button', { name: /more/i }).first().click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    // Configure the request
    await page.getByPlaceholder('Request name').fill('Get Posts')
    await page.getByPlaceholder('Enter request URL').fill('https://jsonplaceholder.typicode.com/posts/1')

    // Send the request
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.getByText('200 OK')).toBeVisible({ timeout: 10000 })

    // Verify response body contains expected data
    await expect(page.getByText('"userId"')).toBeVisible()
  })

  test('should change HTTP method', async ({ page }) => {
    // Create collection and request
    await page.getByRole('button', { name: /plus/i }).first().click()
    await page.getByPlaceholder('My Collection').fill('Method Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Method Test').hover()
    await page.getByRole('button', { name: /more/i }).first().click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    // Change method to POST
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'POST' }).click()

    // Verify POST is selected
    await expect(page.getByRole('combobox')).toContainText('POST')
  })

  test('should add headers to request', async ({ page }) => {
    // Create collection and request
    await page.getByRole('button', { name: /plus/i }).first().click()
    await page.getByPlaceholder('My Collection').fill('Headers Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Headers Test').hover()
    await page.getByRole('button', { name: /more/i }).first().click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    // Go to Headers tab
    await page.getByRole('tab', { name: 'Headers' }).click()

    // Add a header
    await page.getByRole('button', { name: 'Add' }).click()

    // Fill in header details
    await page.getByPlaceholder('Header').fill('Authorization')
    await page.getByPlaceholder('Value').fill('Bearer token123')

    // Verify badge shows 1 header
    await expect(page.getByRole('tab', { name: /Headers/ }).getByText('1')).toBeVisible()
  })

  test('should add query params', async ({ page }) => {
    // Create collection and request
    await page.getByRole('button', { name: /plus/i }).first().click()
    await page.getByPlaceholder('My Collection').fill('Params Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Params Test').hover()
    await page.getByRole('button', { name: /more/i }).first().click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    // Go to Params tab (should be default)
    await page.getByRole('tab', { name: 'Params' }).click()

    // Add a param
    await page.getByRole('button', { name: 'Add' }).click()

    // Fill in param details
    await page.getByPlaceholder('Parameter').fill('page')
    await page.getByPlaceholder('Value').fill('1')

    // Verify badge shows 1 param
    await expect(page.getByRole('tab', { name: /Params/ }).getByText('1')).toBeVisible()
  })

  test('should handle body tab for POST request', async ({ page }) => {
    // Create collection and request
    await page.getByRole('button', { name: /plus/i }).first().click()
    await page.getByPlaceholder('My Collection').fill('Body Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Body Test').hover()
    await page.getByRole('button', { name: /more/i }).first().click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    // Change to POST
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'POST' }).click()

    // Go to Body tab
    await page.getByRole('tab', { name: 'Body' }).click()

    // Select JSON body type
    await page.getByRole('button', { name: 'JSON' }).click()

    // Enter JSON body
    await page.getByPlaceholder('{\n  "key": "value"\n}').fill('{"name": "test", "email": "test@example.com"}')
  })

  test('should delete a collection', async ({ page }) => {
    // Create a collection
    await page.getByRole('button', { name: /plus/i }).first().click()
    await page.getByPlaceholder('My Collection').fill('To Delete')
    await page.getByRole('button', { name: 'Create' }).click()

    // Verify it exists
    await expect(page.getByText('To Delete')).toBeVisible()

    // Delete it
    await page.getByText('To Delete').hover()
    await page.getByRole('button', { name: /more/i }).first().click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()

    // Verify it's gone
    await expect(page.getByText('To Delete')).not.toBeVisible()
    await expect(page.getByText('No collections yet')).toBeVisible()
  })

  test('should copy response body', async ({ page }) => {
    // Create and send a request
    await page.getByRole('button', { name: /plus/i }).first().click()
    await page.getByPlaceholder('My Collection').fill('Copy Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Copy Test').hover()
    await page.getByRole('button', { name: /more/i }).first().click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    await page.getByPlaceholder('Enter request URL').fill('https://jsonplaceholder.typicode.com/posts/1')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.getByText('200 OK')).toBeVisible({ timeout: 10000 })

    // Click copy button
    await page.getByRole('button', { name: 'Copy' }).click()

    // Verify "Copied" text appears
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  })
})

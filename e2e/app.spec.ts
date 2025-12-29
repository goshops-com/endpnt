import { test, expect } from '@playwright/test'

test.describe('Endpnt App', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()
  })

  test('should load the main page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Endpnt' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible()
  })

  test('should show empty collections state', async ({ page }) => {
    await expect(page.getByText('No collections yet')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create your first collection' })).toBeVisible()
  })

  test('should create a new collection', async ({ page }) => {
    // Click the add collection button
    await page.getByRole('button', { name: 'New Collection' }).click()

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
    await page.getByRole('button', { name: 'New Collection' }).click()
    await page.getByPlaceholder('My Collection').fill('My API')
    await page.getByRole('button', { name: 'Create' }).click()

    // Wait for collection to appear
    await expect(page.getByText('My API')).toBeVisible()

    // Add a request to the collection - click the collection options menu
    await page.getByRole('button', { name: 'Collection options' }).click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    // Verify request builder is visible
    await expect(page.getByPlaceholder('Request name')).toBeVisible()

    // Edit the request name
    await page.getByPlaceholder('Request name').fill('Get Users')

    // Enter a URL
    await page.getByPlaceholder('Enter request URL').fill('https://jsonplaceholder.typicode.com/users')

    // Click the collection to expand it
    await page.getByText('My API').click()

    // Verify the request appears in sidebar
    await expect(page.getByText('Get Users')).toBeVisible()
  })

  test('should send a GET request and display response', async ({ page }) => {
    // Create a collection and request
    await page.getByRole('button', { name: 'New Collection' }).click()
    await page.getByPlaceholder('My Collection').fill('JSONPlaceholder')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByRole('button', { name: 'Collection options' }).click()
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
    await page.getByRole('button', { name: 'New Collection' }).click()
    await page.getByPlaceholder('My Collection').fill('Method Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Method Test').click()
    await page.getByRole('button', { name: 'Collection options' }).click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    // Change method to POST
    await page.getByRole('combobox', { name: 'HTTP method' }).click()
    await page.getByRole('option', { name: 'POST' }).click()

    // Verify POST is selected
    await expect(page.getByRole('combobox', { name: 'HTTP method' })).toContainText('POST')
  })

  test('should add headers to request', async ({ page }) => {
    // Create collection and request
    await page.getByRole('button', { name: 'New Collection' }).click()
    await page.getByPlaceholder('My Collection').fill('Headers Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Headers Test').click()
    await page.getByRole('button', { name: 'Collection options' }).click()
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
    await page.getByRole('button', { name: 'New Collection' }).click()
    await page.getByPlaceholder('My Collection').fill('Params Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Params Test').click()
    await page.getByRole('button', { name: 'Collection options' }).click()
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
    await page.getByRole('button', { name: 'New Collection' }).click()
    await page.getByPlaceholder('My Collection').fill('Body Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Body Test').click()
    await page.getByRole('button', { name: 'Collection options' }).click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    // Change to POST
    await page.getByRole('combobox', { name: 'HTTP method' }).click()
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
    await page.getByRole('button', { name: 'New Collection' }).click()
    await page.getByPlaceholder('My Collection').fill('To Delete')
    await page.getByRole('button', { name: 'Create' }).click()

    // Verify it exists
    await expect(page.getByText('To Delete')).toBeVisible()

    // Delete it
    await page.getByText('To Delete').click()
    await page.getByRole('button', { name: 'Collection options' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()

    // Verify it's gone
    await expect(page.getByText('To Delete')).not.toBeVisible()
    await expect(page.getByText('No collections yet')).toBeVisible()
  })

  test('should copy response body', async ({ page }) => {
    // Create and send a request
    await page.getByRole('button', { name: 'New Collection' }).click()
    await page.getByPlaceholder('My Collection').fill('Copy Test')
    await page.getByRole('button', { name: 'Create' }).click()

    await page.getByText('Copy Test').click()
    await page.getByRole('button', { name: 'Collection options' }).click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    await page.getByPlaceholder('Enter request URL').fill('https://jsonplaceholder.typicode.com/posts/1')
    await page.getByRole('button', { name: 'Send' }).click()

    // Wait for response
    await expect(page.getByText('200 OK')).toBeVisible({ timeout: 10000 })

    // Click copy button
    await page.getByRole('button', { name: 'Copy' }).first().click()

    // Verify "Copied" text appears
    await expect(page.getByText('Copied')).toBeVisible()
  })

  test('should persist collections across page refresh (localStorage)', async ({ page }) => {
    // Create a collection
    await page.getByRole('button', { name: 'New Collection' }).click()
    await page.getByPlaceholder('My Collection').fill('Persistent Collection')
    await page.getByPlaceholder('Description of this collection').fill('This should persist')
    await page.getByRole('button', { name: 'Create' }).click()

    // Verify collection is created
    await expect(page.getByText('Persistent Collection')).toBeVisible()

    // Add a request to it
    await page.getByText('Persistent Collection').click()
    await page.getByRole('button', { name: 'Collection options' }).click()
    await page.getByRole('menuitem', { name: 'Add Request' }).click()

    await page.getByPlaceholder('Request name').fill('Persisted Request')
    await page.getByPlaceholder('Enter request URL').fill('https://api.example.com/test')

    // Wait a bit for localStorage to save
    await page.waitForTimeout(1000)

    // Verify localStorage has data
    const storageData = await page.evaluate(() => {
      return {
        collections: localStorage.getItem('endpnt_collections'),
        activeCollectionId: localStorage.getItem('endpnt_active_collection_id'),
      }
    })

    expect(storageData.collections).toBeTruthy()
    expect(storageData.collections).toContain('Persistent Collection')
    expect(storageData.collections).toContain('Persisted Request')

    // Refresh the page
    await page.reload()

    // Wait for Clerk to load and data to appear (takes a few seconds)
    await expect(page.getByText('Persistent Collection')).toBeVisible({ timeout: 10000 })

    // The collection should already be expanded, verify request is visible
    await expect(page.getByText('Persisted Request')).toBeVisible({ timeout: 5000 })
  })

  test('should persist environments across page refresh', async ({ page }) => {
    // Open environment manager
    await page.getByRole('button', { name: 'Manage environments' }).click()

    // Create a new environment
    await page.getByRole('button', { name: 'Create environment' }).click()
    await page.getByPlaceholder('e.g., Development, Production').fill('Test Env')
    await page.getByRole('button', { name: 'Create' }).click()

    // Wait for the environment to be created and visible
    await expect(page.getByText('Test Env')).toBeVisible()

    // Close the dialog
    await page.keyboard.press('Escape')

    // Wait for localStorage to save
    await page.waitForTimeout(500)

    // Verify localStorage has environment data
    const envData = await page.evaluate(() => {
      return localStorage.getItem('endpnt_environments')
    })

    expect(envData).toBeTruthy()
    expect(envData).toContain('Test Env')

    // Refresh the page
    await page.reload()

    // Open environment manager again
    await page.getByRole('button', { name: 'Manage environments' }).click()

    // Verify environment still exists
    await expect(page.getByText('Test Env')).toBeVisible()
  })
})

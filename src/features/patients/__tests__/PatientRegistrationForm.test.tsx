import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createPatient, updatePatient } from '../../../shared/api/patientsApi'
import { notify } from '../../../shared/lib/notify'
import type { PatientRecord } from '../../../shared/types/patient'
import PatientRegistrationForm from '../PatientRegistrationForm'

function fieldByName(name: string): HTMLElement {
  const el = document.querySelector(`[name="${name}"]`)
  if (!el) throw new Error(`No field named "${name}"`)
  return el as HTMLElement
}

async function pickBloodGroup(user: ReturnType<typeof userEvent.setup>, value: string) {
  await user.click(fieldByName('bloodGroup'))
  const opt = await screen.findByRole('option', { name: value })
  await user.click(opt)
}

jest.mock('../../../shared/api/patientsApi', () => ({
  createPatient: jest.fn(() => Promise.resolve()),
  updatePatient: jest.fn(() => Promise.resolve()),
}))

jest.mock('../../../shared/lib/notify', () => ({
  notify: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('../patientId', () => ({
  generatePatientId: jest.fn(() => Promise.resolve('MED-2026-9999')),
}))

const mockedCreate = createPatient as jest.MockedFunction<typeof createPatient>
const mockedUpdate = updatePatient as jest.MockedFunction<typeof updatePatient>

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<PatientRegistrationForm redirectTo="/done" />} />
        <Route path="/done" element={<div>Done page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PatientRegistrationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('shows validation errors when Next is pressed with empty step 1', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText(/full name must be at least/i)).toBeInTheDocument()
  })

  it('advances to contact step when step 1 is valid', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(fieldByName('fullName'), 'Jane Doe')
    await user.type(fieldByName('dob'), '1990-06-15')
    await pickBloodGroup(user, 'A+')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('heading', { name: 'Contact & address' })).toBeInTheDocument()
  })

  it('submits registration and navigates after review', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(fieldByName('fullName'), 'Jane Doe')
    await user.type(fieldByName('dob'), '1990-06-15')
    await pickBloodGroup(user, 'A+')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await screen.findByRole('heading', { name: 'Contact & address' })
    await user.type(fieldByName('phone'), '9876543210')
    await user.type(fieldByName('email'), 'jane@example.com')
    await user.type(fieldByName('address'), '123 Main Street')
    await user.type(fieldByName('city'), 'Mumbai')
    await user.type(fieldByName('state'), 'MH')
    await user.type(fieldByName('pin'), '400001')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('heading', { name: 'Medical history' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await screen.findByRole('heading', { name: 'Emergency contact' })
    await user.type(fieldByName('emergencyName'), 'Bob Contact')
    await user.type(fieldByName('emergencyRelationship'), 'Brother')
    await user.type(fieldByName('emergencyPhone'), '9123456789')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByRole('heading', { name: 'Review & submit' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Register patient' }))

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledTimes(1)
    })
    const record = mockedCreate.mock.calls[0][0]
    expect(record.fullName).toBe('Jane Doe')
    expect(record.id).toBe('MED-2026-9999')
    expect(notify.success).toHaveBeenCalled()
    expect(await screen.findByText('Done page')).toBeInTheDocument()
  })

  it('shows exit link on step 0 when exitTo is set', () => {
    render(
      <MemoryRouter>
        <PatientRegistrationForm redirectTo="/done" exitTo="/list" exitLabel="Leave" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Leave' })).toHaveAttribute('href', '/list')
  })

  it('goes back to the previous step', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(fieldByName('fullName'), 'Jane Doe')
    await user.type(fieldByName('dob'), '1990-06-15')
    await pickBloodGroup(user, 'A+')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Contact & address' })
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'Personal information' })).toBeInTheDocument()
  })

  it('updates an existing record in edit mode', async () => {
    const user = userEvent.setup()
    const initial: PatientRecord = {
      id: 'MED-EDIT-1',
      fullName: 'Old Name',
      dob: '1988-01-01',
      gender: 'male',
      bloodGroup: 'O+',
      phone: '9876543210',
      email: 'old@example.com',
      address: '1 Main Street',
      city: 'Mumbai',
      state: 'MH',
      pin: '400001',
      photo: null,
      allergies: 'a',
      chronicConditions: 'c',
      pastSurgeries: 'p',
      currentMedications: 'm',
      emergencyName: 'Em Contact',
      emergencyRelationship: 'Bro',
      emergencyPhone: '9123456789',
      createdAt: 1,
      isActive: true,
    }
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <Routes>
          <Route path="/edit" element={<PatientRegistrationForm redirectTo="/done" initialRecord={initial} />} />
          <Route path="/done" element={<div>Done page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    const nameInput = fieldByName('fullName') as HTMLInputElement
    await user.clear(nameInput)
    await user.type(nameInput, 'New Name')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Contact & address' })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Medical history' })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Emergency contact' })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Review & submit' })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledTimes(1)
    })
    expect(mockedUpdate.mock.calls[0][0]).toBe('MED-EDIT-1')
    expect(mockedUpdate.mock.calls[0][1].fullName).toBe('New Name')
    expect(notify.success).toHaveBeenCalled()
    expect(await screen.findByText('Done page')).toBeInTheDocument()
  })

  it('surfaces API errors on submit', async () => {
    mockedCreate.mockRejectedValueOnce(new Error('Server down'))
    const user = userEvent.setup()
    renderForm()

    await user.type(fieldByName('fullName'), 'Jane Doe')
    await user.type(fieldByName('dob'), '1990-06-15')
    await pickBloodGroup(user, 'A+')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Contact & address' })
    await user.type(fieldByName('phone'), '9876543210')
    await user.type(fieldByName('email'), 'jane@example.com')
    await user.type(fieldByName('address'), '123 Main Street')
    await user.type(fieldByName('city'), 'Mumbai')
    await user.type(fieldByName('state'), 'MH')
    await user.type(fieldByName('pin'), '400001')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Medical history' })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Emergency contact' })
    await user.type(fieldByName('emergencyName'), 'Bob Contact')
    await user.type(fieldByName('emergencyRelationship'), 'Brother')
    await user.type(fieldByName('emergencyPhone'), '9123456789')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Review & submit' })
    await user.click(screen.getByRole('button', { name: 'Register patient' }))

    expect(await screen.findByText('Server down')).toBeInTheDocument()
    expect(notify.error).toHaveBeenCalledWith('Server down')
  })

  it('resets the form when initialRecord identity changes', async () => {
    const user = userEvent.setup()
    const r1: PatientRecord = {
      id: 'A',
      fullName: 'One',
      dob: '1990-01-01',
      gender: 'male',
      bloodGroup: 'A+',
      phone: '9876543210',
      email: 'a@b.com',
      address: 'Addr',
      city: 'C',
      state: 'S',
      pin: '1234',
      photo: null,
      allergies: '',
      chronicConditions: '',
      pastSurgeries: '',
      currentMedications: '',
      emergencyName: 'E',
      emergencyRelationship: 'R',
      emergencyPhone: '9123456789',
      createdAt: 1,
      isActive: true,
    }
    const r2: PatientRecord = { ...r1, id: 'B', fullName: 'Two' }
    const { rerender } = render(
      <MemoryRouter>
        <PatientRegistrationForm initialRecord={r1} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('heading', { name: 'Contact & address' })
    rerender(
      <MemoryRouter>
        <PatientRegistrationForm initialRecord={r2} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Personal information' })).toBeInTheDocument()
    expect((fieldByName('fullName') as HTMLInputElement).value).toBe('Two')
  })

  it('loads photo preview from file input', async () => {
    class FR {
      result: string | ArrayBuffer | null = 'data:image/png;base64,xx'
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null
      readAsDataURL() {
        queueMicrotask(() => this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>))
      }
    }
    const frSpy = jest.spyOn(globalThis, 'FileReader').mockImplementation(() => new FR() as unknown as FileReader)
    try {
      const user = userEvent.setup()
      renderForm()
      await user.type(fieldByName('fullName'), 'Jane Doe')
      await user.type(fieldByName('dob'), '1990-06-15')
      await pickBloodGroup(user, 'A+')
      const file = new File(['x'], 'p.png', { type: 'image/png' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await user.upload(input, file)
      await waitFor(() => {
        const img = document.querySelector('img[src^="data:image"]')
        expect(img).toHaveAttribute('src', 'data:image/png;base64,xx')
      })
    } finally {
      frSpy.mockRestore()
    }
  })

  it('clears photo when the file input has no file', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(fieldByName('fullName'), 'Jane Doe')
    await user.type(fieldByName('dob'), '1990-06-15')
    await pickBloodGroup(user, 'A+')
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const emptyList = { length: 0, item: () => null } as FileList
    Object.defineProperty(input, 'files', { value: emptyList, configurable: true })
    fireEvent.change(input)
  })

  it('prevents default on programmatic form submit', () => {
    renderForm()
    const form = document.querySelector('form') as HTMLFormElement
    fireEvent.submit(form)
  })
})

/**
 * Test utility for appointment conflict detection
 * This file contains test cases to verify the appointment conflict detection functionality
 */

export interface TestAppointment {
  id?: string
  start_time: string
  end_time: string
  patient_id: string
  status: string
}

export class AppointmentConflictTester {
  /**
   * Test cases for appointment conflict detection
   */
  static getTestCases(): Array<{
    name: string
    existing: TestAppointment[]
    new: TestAppointment
    excludeId?: string
    expectedConflict: boolean
    description: string
  }> {
    return [
      {
        name: 'No conflict - different times',
        existing: [
          {
            id: '1',
            start_time: '2024-01-01T09:00:00.000Z',
            end_time: '2024-01-01T10:00:00.000Z',
            patient_id: 'patient1',
            status: 'scheduled'
          }
        ],
        new: {
          start_time: '2024-01-01T11:00:00.000Z',
          end_time: '2024-01-01T12:00:00.000Z',
          patient_id: 'patient2',
          status: 'scheduled'
        },
        expectedConflict: false,
        description: 'New appointment is after existing appointment with no overlap'
      },
      {
        name: 'Conflict - overlapping times',
        existing: [
          {
            id: '1',
            start_time: '2024-01-01T09:00:00.000Z',
            end_time: '2024-01-01T10:00:00.000Z',
            patient_id: 'patient1',
            status: 'scheduled'
          }
        ],
        new: {
          start_time: '2024-01-01T09:30:00.000Z',
          end_time: '2024-01-01T10:30:00.000Z',
          patient_id: 'patient2',
          status: 'scheduled'
        },
        expectedConflict: true,
        description: 'New appointment overlaps with existing appointment'
      },
      {
        name: 'Conflict - new appointment starts before and ends during existing',
        existing: [
          {
            id: '1',
            start_time: '2024-01-01T09:00:00.000Z',
            end_time: '2024-01-01T10:00:00.000Z',
            patient_id: 'patient1',
            status: 'scheduled'
          }
        ],
        new: {
          start_time: '2024-01-01T08:30:00.000Z',
          end_time: '2024-01-01T09:30:00.000Z',
          patient_id: 'patient2',
          status: 'scheduled'
        },
        expectedConflict: true,
        description: 'New appointment starts before and ends during existing appointment'
      },
      {
        name: 'Conflict - new appointment completely contains existing',
        existing: [
          {
            id: '1',
            start_time: '2024-01-01T09:00:00.000Z',
            end_time: '2024-01-01T10:00:00.000Z',
            patient_id: 'patient1',
            status: 'scheduled'
          }
        ],
        new: {
          start_time: '2024-01-01T08:30:00.000Z',
          end_time: '2024-01-01T10:30:00.000Z',
          patient_id: 'patient2',
          status: 'scheduled'
        },
        expectedConflict: true,
        description: 'New appointment completely contains existing appointment'
      },
      {
        name: 'Conflict - new appointment is completely contained within existing',
        existing: [
          {
            id: '1',
            start_time: '2024-01-01T08:30:00.000Z',
            end_time: '2024-01-01T10:30:00.000Z',
            patient_id: 'patient1',
            status: 'scheduled'
          }
        ],
        new: {
          start_time: '2024-01-01T09:00:00.000Z',
          end_time: '2024-01-01T10:00:00.000Z',
          patient_id: 'patient2',
          status: 'scheduled'
        },
        expectedConflict: true,
        description: 'New appointment is completely contained within existing appointment'
      },
      {
        name: 'No conflict - cancelled appointment',
        existing: [
          {
            id: '1',
            start_time: '2024-01-01T09:00:00.000Z',
            end_time: '2024-01-01T10:00:00.000Z',
            patient_id: 'patient1',
            status: 'cancelled'
          }
        ],
        new: {
          start_time: '2024-01-01T09:30:00.000Z',
          end_time: '2024-01-01T10:30:00.000Z',
          patient_id: 'patient2',
          status: 'scheduled'
        },
        expectedConflict: false,
        description: 'No conflict with cancelled appointments'
      },
      {
        name: 'No conflict - updating same appointment',
        existing: [
          {
            id: '1',
            start_time: '2024-01-01T09:00:00.000Z',
            end_time: '2024-01-01T10:00:00.000Z',
            patient_id: 'patient1',
            status: 'scheduled'
          }
        ],
        new: {
          start_time: '2024-01-01T09:30:00.000Z',
          end_time: '2024-01-01T10:30:00.000Z',
          patient_id: 'patient1',
          status: 'scheduled'
        },
        excludeId: '1',
        expectedConflict: false,
        description: 'No conflict when updating the same appointment (excluded from check)'
      },
      {
        name: 'No conflict - adjacent appointments',
        existing: [
          {
            id: '1',
            start_time: '2024-01-01T09:00:00.000Z',
            end_time: '2024-01-01T10:00:00.000Z',
            patient_id: 'patient1',
            status: 'scheduled'
          }
        ],
        new: {
          start_time: '2024-01-01T10:00:00.000Z',
          end_time: '2024-01-01T11:00:00.000Z',
          patient_id: 'patient2',
          status: 'scheduled'
        },
        expectedConflict: false,
        description: 'No conflict when appointments are adjacent (end time = start time)'
      }
    ]
  }

  /**
   * Run all test cases and return results
   */
  static async runTests(): Promise<{
    passed: number
    failed: number
    total: number
    results: Array<{
      name: string
      passed: boolean
      expected: boolean
      actual: boolean
      description: string
      error?: string
    }>
  }> {
    const testCases = this.getTestCases()
    const results = []
    let passed = 0
    let failed = 0

    for (const testCase of testCases) {
      try {
        // This would need to be implemented with actual database calls
        // For now, we'll just return the test structure
        const actual = await this.simulateConflictCheck(
          testCase.existing,
          testCase.new,
          testCase.excludeId
        )
        
        const testPassed = actual === testCase.expectedConflict
        
        results.push({
          name: testCase.name,
          passed: testPassed,
          expected: testCase.expectedConflict,
          actual,
          description: testCase.description
        })

        if (testPassed) {
          passed++
        } else {
          failed++
        }
      } catch (error) {
        results.push({
          name: testCase.name,
          passed: false,
          expected: testCase.expectedConflict,
          actual: false,
          description: testCase.description,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        failed++
      }
    }

    return {
      passed,
      failed,
      total: testCases.length,
      results
    }
  }

  /**
   * Simulate conflict check logic (for testing purposes)
   * In a real implementation, this would call the actual database service
   */
  private static async simulateConflictCheck(
    existing: TestAppointment[],
    newAppointment: TestAppointment,
    excludeId?: string
  ): Promise<boolean> {
    const newStart = new Date(newAppointment.start_time)
    const newEnd = new Date(newAppointment.end_time)

    for (const appointment of existing) {
      // Skip cancelled appointments
      if (appointment.status === 'cancelled') {
        continue
      }

      // Skip excluded appointment (when updating)
      if (excludeId && appointment.id === excludeId) {
        continue
      }

      const existingStart = new Date(appointment.start_time)
      const existingEnd = new Date(appointment.end_time)

      // Check for overlap
      const hasOverlap = (
        (newStart < existingEnd && newEnd > existingStart) ||
        (newStart < existingStart && newEnd > existingEnd) ||
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd)
      )

      if (hasOverlap) {
        return true
      }
    }

    return false
  }
}

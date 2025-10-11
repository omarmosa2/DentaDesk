/**
 * Migration utility for converting legacy dental treatments to multiple treatments system
 * This is an optional migration script for users who want to convert existing data
 */

import { DentalTreatment, ToothTreatment } from '@/types'
import { getTreatmentByValue } from '@/data/teethData'

interface MigrationResult {
  success: boolean
  migratedCount: number
  errors: string[]
  skippedCount: number
}

/**
 * Convert legacy dental treatment to new tooth treatment format
 */
export const convertLegacyTreatment = (legacyTreatment: DentalTreatment): ToothTreatment[] => {
  const treatments: ToothTreatment[] = []
  let priority = 1

  // Convert current_treatment if exists
  if (legacyTreatment.current_treatment && legacyTreatment.current_treatment !== 'healthy') {
    const treatmentInfo = getTreatmentByValue(legacyTreatment.current_treatment)
    
    treatments.push({
      id: `migrated-current-${legacyTreatment.id}`,
      patient_id: legacyTreatment.patient_id,
      tooth_number: legacyTreatment.tooth_number,
      tooth_name: legacyTreatment.tooth_name,
      treatment_type: legacyTreatment.current_treatment,
      treatment_category: treatmentInfo?.category || 'restorative',
      treatment_status: legacyTreatment.treatment_status === 'completed' ? 'completed' : 'in_progress',
      treatment_color: treatmentInfo?.color || legacyTreatment.treatment_color,
      start_date: legacyTreatment.created_at.split('T')[0], // Extract date part
      completion_date: legacyTreatment.treatment_status === 'completed' 
        ? legacyTreatment.updated_at.split('T')[0] 
        : null,
      cost: legacyTreatment.cost || 0,
      priority: priority++,
      notes: legacyTreatment.notes || legacyTreatment.treatment_details || null,
      appointment_id: legacyTreatment.appointment_id,
      created_at: legacyTreatment.created_at,
      updated_at: legacyTreatment.updated_at
    })
  }

  // Convert next_treatment if exists
  if (legacyTreatment.next_treatment && legacyTreatment.next_treatment !== 'healthy') {
    const treatmentInfo = getTreatmentByValue(legacyTreatment.next_treatment)
    
    treatments.push({
      id: `migrated-next-${legacyTreatment.id}`,
      patient_id: legacyTreatment.patient_id,
      tooth_number: legacyTreatment.tooth_number,
      tooth_name: legacyTreatment.tooth_name,
      treatment_type: legacyTreatment.next_treatment,
      treatment_category: treatmentInfo?.category || 'restorative',
      treatment_status: 'planned',
      treatment_color: treatmentInfo?.color || '#22c55e',
      start_date: null,
      completion_date: null,
      cost: 0,
      priority: priority++,
      notes: `علاج مخطط (محول من النظام القديم)`,
      appointment_id: null,
      created_at: legacyTreatment.created_at,
      updated_at: legacyTreatment.updated_at
    })
  }

  return treatments
}

/**
 * Migrate all legacy treatments to new system
 */
export const migrateLegacyTreatments = async (
  legacyTreatments: DentalTreatment[],
  createToothTreatmentFn: (treatment: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>) => Promise<ToothTreatment>
): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    errors: [],
    skippedCount: 0
  }

  console.log(`🔄 Starting migration of ${legacyTreatments.length} legacy treatments...`)

  for (const legacyTreatment of legacyTreatments) {
    try {
      // Skip if no treatments to migrate
      if ((!legacyTreatment.current_treatment || legacyTreatment.current_treatment === 'healthy') &&
          (!legacyTreatment.next_treatment || legacyTreatment.next_treatment === 'healthy')) {
        result.skippedCount++
        continue
      }

      // Convert legacy treatment to new format
      const newTreatments = convertLegacyTreatment(legacyTreatment)

      // Create each new treatment
      for (const newTreatment of newTreatments) {
        const { id, created_at, updated_at, ...treatmentData } = newTreatment
        await createToothTreatmentFn(treatmentData)
        result.migratedCount++
      }

      console.log(`✅ Migrated treatment for tooth ${legacyTreatment.tooth_number} (Patient: ${legacyTreatment.patient_id})`)

    } catch (error) {
      const errorMessage = `Failed to migrate treatment ${legacyTreatment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMessage)
      console.error(`❌ ${errorMessage}`)
      result.success = false
    }
  }

  console.log(`🎉 Migration completed:`)
  console.log(`   ✅ Migrated: ${result.migratedCount} treatments`)
  console.log(`   ⏭️ Skipped: ${result.skippedCount} treatments`)
  console.log(`   ❌ Errors: ${result.errors.length}`)

  return result
}

/**
 * Generate migration report
 */
export const generateMigrationReport = (
  legacyTreatments: DentalTreatment[]
): {
  totalLegacyTreatments: number
  treatmentsToMigrate: number
  treatmentsToSkip: number
  estimatedNewTreatments: number
  breakdown: {
    currentTreatments: number
    nextTreatments: number
    healthyTeeth: number
  }
} => {
  const breakdown = {
    currentTreatments: 0,
    nextTreatments: 0,
    healthyTeeth: 0
  }

  let treatmentsToMigrate = 0
  let estimatedNewTreatments = 0

  for (const treatment of legacyTreatments) {
    let hasCurrentTreatment = false
    let hasNextTreatment = false

    if (treatment.current_treatment && treatment.current_treatment !== 'healthy') {
      breakdown.currentTreatments++
      hasCurrentTreatment = true
      estimatedNewTreatments++
    }

    if (treatment.next_treatment && treatment.next_treatment !== 'healthy') {
      breakdown.nextTreatments++
      hasNextTreatment = true
      estimatedNewTreatments++
    }

    if (!hasCurrentTreatment && !hasNextTreatment) {
      breakdown.healthyTeeth++
    } else {
      treatmentsToMigrate++
    }
  }

  return {
    totalLegacyTreatments: legacyTreatments.length,
    treatmentsToMigrate,
    treatmentsToSkip: breakdown.healthyTeeth,
    estimatedNewTreatments,
    breakdown
  }
}

/**
 * Validate migration data before starting
 */
export const validateMigrationData = (legacyTreatments: DentalTreatment[]): {
  isValid: boolean
  issues: string[]
  warnings: string[]
} => {
  const issues: string[] = []
  const warnings: string[] = []

  // Check for required fields
  for (const treatment of legacyTreatments) {
    if (!treatment.id) {
      issues.push(`Treatment missing ID`)
    }
    if (!treatment.patient_id) {
      issues.push(`Treatment ${treatment.id} missing patient_id`)
    }
    if (!treatment.tooth_number) {
      issues.push(`Treatment ${treatment.id} missing tooth_number`)
    }
    if (!treatment.tooth_name) {
      warnings.push(`Treatment ${treatment.id} missing tooth_name`)
    }
  }

  // Check for duplicates
  const seenTreatments = new Set<string>()
  for (const treatment of legacyTreatments) {
    const key = `${treatment.patient_id}-${treatment.tooth_number}`
    if (seenTreatments.has(key)) {
      warnings.push(`Duplicate treatment found for patient ${treatment.patient_id}, tooth ${treatment.tooth_number}`)
    }
    seenTreatments.add(key)
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings
  }
}

/**
 * Main migration function with full validation and reporting
 */
export const performFullMigration = async (
  legacyTreatments: DentalTreatment[],
  createToothTreatmentFn: (treatment: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>) => Promise<ToothTreatment>,
  options: {
    dryRun?: boolean
    skipValidation?: boolean
  } = {}
): Promise<{
  report: ReturnType<typeof generateMigrationReport>
  validation: ReturnType<typeof validateMigrationData>
  result?: MigrationResult
}> => {
  console.log('🔍 Generating migration report...')
  const report = generateMigrationReport(legacyTreatments)
  
  console.log('📊 Migration Report:')
  console.log(`   Total legacy treatments: ${report.totalLegacyTreatments}`)
  console.log(`   Treatments to migrate: ${report.treatmentsToMigrate}`)
  console.log(`   Treatments to skip: ${report.treatmentsToSkip}`)
  console.log(`   Estimated new treatments: ${report.estimatedNewTreatments}`)
  console.log(`   Current treatments: ${report.breakdown.currentTreatments}`)
  console.log(`   Next treatments: ${report.breakdown.nextTreatments}`)
  console.log(`   Healthy teeth: ${report.breakdown.healthyTeeth}`)

  if (!options.skipValidation) {
    console.log('🔍 Validating migration data...')
    const validation = validateMigrationData(legacyTreatments)
    
    if (!validation.isValid) {
      console.error('❌ Validation failed:')
      validation.issues.forEach(issue => console.error(`   - ${issue}`))
      return { report, validation }
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Validation warnings:')
      validation.warnings.forEach(warning => console.warn(`   - ${warning}`))
    }

    if (options.dryRun) {
      console.log('🧪 Dry run completed. No data was migrated.')
      return { report, validation }
    }

    console.log('✅ Validation passed. Starting migration...')
    const result = await migrateLegacyTreatments(legacyTreatments, createToothTreatmentFn)
    
    return { report, validation, result }
  }

  if (options.dryRun) {
    console.log('🧪 Dry run completed. No data was migrated.')
    return { report, validation: { isValid: true, issues: [], warnings: [] } }
  }

  console.log('⚠️ Skipping validation. Starting migration...')
  const result = await migrateLegacyTreatments(legacyTreatments, createToothTreatmentFn)
  
  return { 
    report, 
    validation: { isValid: true, issues: [], warnings: [] }, 
    result 
  }
}

export default {
  convertLegacyTreatment,
  migrateLegacyTreatments,
  generateMigrationReport,
  validateMigrationData,
  performFullMigration
}

-- Optimized Queries for Dental Clinic Database
-- These queries are optimized for performance and use proper indexing

-- 1. Get patient with recent appointments and payments
-- Optimized with proper JOINs and LIMIT
SELECT 
    p.*,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_appointments,
    COALESCE(SUM(py.amount), 0) as total_paid,
    MAX(a.start_time) as last_appointment_date
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
LEFT JOIN payments py ON p.id = py.patient_id AND py.status = 'completed'
WHERE p.id = ?
GROUP BY p.id;

-- 2. Get appointments for date range with patient and treatment info
-- Uses date indexing for optimal performance
SELECT 
    a.*,
    p.first_name || ' ' || p.last_name as patient_name,
    p.phone as patient_phone,
    t.name as treatment_name,
    t.default_cost as treatment_cost,
    t.duration_minutes as treatment_duration
FROM appointments a
INNER JOIN patients p ON a.patient_id = p.id
LEFT JOIN treatments t ON a.treatment_id = t.id
WHERE DATE(a.start_time) BETWEEN ? AND ?
ORDER BY a.start_time ASC;

-- 3. Get financial summary for date range
-- Optimized for financial reporting
SELECT 
    DATE(py.payment_date) as payment_date,
    COUNT(*) as payment_count,
    SUM(py.amount) as total_amount,
    SUM(py.discount_amount) as total_discount,
    SUM(py.tax_amount) as total_tax,
    SUM(CASE WHEN py.status = 'completed' THEN py.amount ELSE 0 END) as completed_amount,
    SUM(CASE WHEN py.status = 'pending' THEN py.amount ELSE 0 END) as pending_amount
FROM payments py
WHERE py.payment_date BETWEEN ? AND ?
GROUP BY DATE(py.payment_date)
ORDER BY payment_date DESC;

-- 4. Get patient treatment history with costs
-- Shows complete treatment history for a patient
SELECT 
    a.start_time as appointment_date,
    a.title as appointment_title,
    a.status as appointment_status,
    t.name as treatment_name,
    t.category as treatment_category,
    a.cost as actual_cost,
    t.default_cost as standard_cost,
    py.amount as amount_paid,
    py.payment_method,
    py.status as payment_status
FROM appointments a
LEFT JOIN treatments t ON a.treatment_id = t.id
LEFT JOIN payments py ON a.id = py.appointment_id
WHERE a.patient_id = ?
ORDER BY a.start_time DESC;

-- 5. Get overdue payments with patient info
-- Finds payments that are overdue for follow-up
SELECT 
    py.*,
    p.first_name || ' ' || p.last_name as patient_name,
    p.phone as patient_phone,
    p.email as patient_email,
    JULIANDAY('now') - JULIANDAY(py.payment_date) as days_overdue
FROM payments py
INNER JOIN patients p ON py.patient_id = p.id
WHERE py.status = 'pending' 
    AND py.payment_date < DATE('now', '-30 days')
ORDER BY py.payment_date ASC;

-- 6. Get inventory items low on stock
-- Optimized inventory management query
SELECT 
    i.*,
    (i.minimum_stock - i.quantity) as shortage_amount,
    CASE 
        WHEN i.expiry_date < DATE('now') THEN 'expired'
        WHEN i.expiry_date < DATE('now', '+30 days') THEN 'expiring_soon'
        ELSE 'ok'
    END as expiry_status
FROM inventory i
WHERE i.quantity <= i.minimum_stock
    OR i.expiry_date < DATE('now', '+30 days')
ORDER BY 
    CASE WHEN i.quantity <= i.minimum_stock THEN 1 ELSE 2 END,
    i.expiry_date ASC;

-- 7. Get appointment statistics by treatment
-- Performance analytics for treatments
SELECT 
    t.name as treatment_name,
    t.category as treatment_category,
    COUNT(a.id) as total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_count,
    AVG(a.cost) as average_cost,
    SUM(CASE WHEN a.status = 'completed' THEN a.cost ELSE 0 END) as total_revenue
FROM treatments t
LEFT JOIN appointments a ON t.id = a.treatment_id
WHERE a.start_time >= DATE('now', '-1 year')
GROUP BY t.id, t.name, t.category
HAVING COUNT(a.id) > 0
ORDER BY total_revenue DESC;

-- 8. Get patient search with ranking
-- Advanced patient search with relevance ranking
SELECT 
    p.*,
    COUNT(a.id) as appointment_count,
    MAX(a.start_time) as last_visit,
    CASE 
        WHEN p.first_name LIKE ? || '%' THEN 3
        WHEN p.last_name LIKE ? || '%' THEN 3
        WHEN p.phone LIKE ? || '%' THEN 2
        ELSE 1
    END as relevance_score
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
WHERE p.first_name LIKE '%' || ? || '%'
    OR p.last_name LIKE '%' || ? || '%'
    OR p.phone LIKE '%' || ? || '%'
    OR p.email LIKE '%' || ? || '%'
GROUP BY p.id
ORDER BY relevance_score DESC, p.last_name, p.first_name;

-- 9. Get monthly revenue trend
-- Financial trend analysis
SELECT 
    strftime('%Y-%m', py.payment_date) as month,
    COUNT(*) as payment_count,
    COUNT(DISTINCT py.patient_id) as unique_patients,
    SUM(py.amount) as total_revenue,
    AVG(py.amount) as average_payment,
    SUM(CASE WHEN py.payment_method = 'cash' THEN py.amount ELSE 0 END) as cash_revenue,
    SUM(CASE WHEN py.payment_method = 'card' THEN py.amount ELSE 0 END) as card_revenue
FROM payments py
WHERE py.status = 'completed'
    AND py.payment_date >= DATE('now', '-12 months')
GROUP BY strftime('%Y-%m', py.payment_date)
ORDER BY month DESC;

-- 10. Get patient images with appointment context
-- Optimized query for patient image management
SELECT 
    pi.*,
    p.first_name || ' ' || p.last_name as patient_name,
    a.title as appointment_title,
    a.start_time as appointment_date,
    t.name as treatment_name
FROM patient_images pi
INNER JOIN patients p ON pi.patient_id = p.id
LEFT JOIN appointments a ON pi.appointment_id = a.id
LEFT JOIN treatments t ON a.treatment_id = t.id
WHERE pi.patient_id = ?
ORDER BY pi.created_at DESC;

-- 11. Get installment payment schedule
-- Payment plan management
SELECT 
    ip.*,
    py.amount as total_payment_amount,
    py.patient_id,
    p.first_name || ' ' || p.last_name as patient_name,
    p.phone as patient_phone,
    CASE 
        WHEN ip.status = 'pending' AND ip.due_date < DATE('now') THEN 'overdue'
        WHEN ip.status = 'pending' AND ip.due_date <= DATE('now', '+7 days') THEN 'due_soon'
        ELSE ip.status
    END as payment_status
FROM installment_payments ip
INNER JOIN payments py ON ip.payment_id = py.id
INNER JOIN patients p ON py.patient_id = p.id
WHERE ip.status IN ('pending', 'overdue')
ORDER BY ip.due_date ASC;

-- 12. Database statistics query
-- System health and usage statistics
SELECT 
    'patients' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_created
FROM patients
UNION ALL
SELECT 
    'appointments' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_created
FROM appointments
UNION ALL
SELECT 
    'payments' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_created
FROM payments
UNION ALL
SELECT 
    'treatments' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_created
FROM treatments;

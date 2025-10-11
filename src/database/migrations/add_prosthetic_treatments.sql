-- Migration: Add new prosthetic treatments to the database
-- Date: 2025-07-01
-- Description: Adding comprehensive prosthetic treatment options including dentures, implant crowns, post cores, and veneers

-- Insert new prosthetic treatments
INSERT OR IGNORE INTO treatments (id, name, description, default_cost, duration_minutes, category) VALUES

-- أجهزة متحركة (Removable Dentures)
('complete_denture_acrylic', 'جهاز متحرك كامل أكريل', 'جهاز أسنان متحرك كامل مصنوع من الأكريل', 1200.00, 180, 'التعويضات'),
('partial_denture_acrylic', 'جهاز متحرك جزئي أكريل', 'جهاز أسنان متحرك جزئي مصنوع من الأكريل', 800.00, 150, 'التعويضات'),
('complete_denture_vitalium', 'جهاز متحرك كامل فيتاليوم', 'جهاز أسنان متحرك كامل مصنوع من الفيتاليوم', 1800.00, 200, 'التعويضات'),
('partial_denture_vitalium', 'جهاز متحرك جزئي فيتاليوم', 'جهاز أسنان متحرك جزئي مصنوع من الفيتاليوم', 1400.00, 180, 'التعويضات'),
('complete_denture_flexible', 'جهاز متحرك كامل مرن', 'جهاز أسنان متحرك كامل مصنوع من مواد مرنة', 1500.00, 160, 'التعويضات'),
('partial_denture_flexible', 'جهاز متحرك جزئي مرن', 'جهاز أسنان متحرك جزئي مصنوع من مواد مرنة', 1000.00, 140, 'التعويضات'),

-- تعويضات فوق الزرعات (Implant Crowns)
('implant_crown_zirconia', 'تعويض زركونيا فوق زرعة', 'تاج زركونيا مثبت فوق زرعة سنية', 1500.00, 120, 'التعويضات'),
('implant_crown_ceramic', 'تعويض خزف فوق زرعة', 'تاج خزفي مثبت فوق زرعة سنية', 1200.00, 120, 'التعويضات'),

-- قلوب وأوتاد (Post and Cores)
('cast_post_core', 'قلب ووتد مصبوب معدني', 'قلب ووتد معدني مصبوب لتقوية السن', 400.00, 90, 'التعويضات'),
('zirconia_post_core', 'قلب ووتد زركونيا', 'قلب ووتد مصنوع من الزركونيا', 600.00, 90, 'التعويضات'),

-- فينير (Veneers)
('veneer', 'فينير', 'قشور خزفية رقيقة للأسنان الأمامية', 800.00, 120, 'التعويضات');

-- Update existing crown treatment to be more specific
UPDATE treatments
SET name = 'تاج معدني', description = 'تاج معدني تقليدي للأسنان'
WHERE id = 'crown';

-- Insert default labs if they don't exist

-- Verify the insertions
SELECT COUNT(*) as total_prosthetic_treatments
FROM treatments
WHERE category = 'التعويضات';

SELECT COUNT(*) as total_labs
FROM labs;

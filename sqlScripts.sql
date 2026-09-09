-- TABLO_TIPI: LISTE
CREATE TABLE tb_proje_durumlari (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    code varchar(50) unique not null,
    name varchar(100) not null
);

-- TABLO_TIPI: LISTE
CREATE TABLE tb_risk_dereceleri (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    code varchar(50) unique not null,
    name varchar(100) not null
);

-- TABLO_TIPI: LISTE
CREATE TABLE tb_kullanici_rolleri (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    code varchar(50) unique not null,
    name varchar(100) not null,
    description text
);

-- TABLO_TIPI: DATA
CREATE TABLE tb_projeler (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_code varchar(50) unique not null,
    name varchar(255) not null,
    location varchar(255) not null,
    ada_parsel varchar(100) not null,
    area varchar(100),
    risk_level varchar(50) default 'Düşük',
    overall_progress numeric(5,2) default 0,
    budget numeric(15,2) default 0,
    spent numeric(15,2) default 0,
    planned_spent numeric(15,2) default 0,
    earned_value numeric(15,2) default 0,
    status varchar(50) default 'Planlama',
    center_lng numeric(10,6),
    center_lat numeric(10,6)
);

-- TABLO_TIPI: GEOMETRI
CREATE TABLE tb_proje_sinirlari (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_id varchar(50) not null,
    project_name varchar(255) not null,
    ada_parsel varchar(100) not null,
    area_sqm numeric(12,2) not null,
    srid integer default 5257
);
SELECT AddGeometryColumn('public','tb_proje_sinirlari','the_geom',5257,'POLYGON',2);
CREATE INDEX idx_tb_proje_sinirlari_geom ON tb_proje_sinirlari USING GIST (the_geom);

-- TABLO_TIPI: GEOMETRI
CREATE TABLE tb_binalar_3d (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_id varchar(50) not null,
    block_name varchar(150) not null,
    building_type varchar(100) not null,
    height_meters numeric(6,2) not null,
    floors_count integer not null,
    construction_progress numeric(5,2) default 0,
    structural_status varchar(100) not null,
    footprint_area_sqm numeric(10,2) not null,
    srid integer default 5257
);
SELECT AddGeometryColumn('public','tb_binalar_3d','the_geom',5257,'POLYGON',2);
CREATE INDEX idx_tb_binalar_3d_geom ON tb_binalar_3d USING GIST (the_geom);

-- TABLO_TIPI: GEOMETRI
CREATE TABLE tb_altyapi_hatlari (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_id varchar(50) not null,
    line_type varchar(50) not null,
    network_name varchar(255) not null,
    pipe_or_cable_spec varchar(255) not null,
    depth_meters numeric(6,2) not null,
    voltage_or_pressure varchar(100) not null,
    total_length_meters numeric(10,2) not null,
    status varchar(50) default 'Faal',
    srid integer default 5257
);
SELECT AddGeometryColumn('public','tb_altyapi_hatlari','the_geom',5257,'LINESTRING',2);
CREATE INDEX idx_tb_altyapi_hatlari_geom ON tb_altyapi_hatlari USING GIST (the_geom);

-- TABLO_TIPI: GEOMETRI
CREATE TABLE tb_bloklar (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_id varchar(50) not null,
    name varchar(150) not null,
    height numeric(6,2) not null,
    floors integer not null,
    progress numeric(5,2) default 0,
    status varchar(100) default 'Planlandı',
    center_lng numeric(10,6),
    center_lat numeric(10,6)
);
SELECT AddGeometryColumn('public','tb_bloklar','the_geom',5257,'POLYGON',2);
CREATE INDEX idx_tb_bloklar_geom ON tb_bloklar USING GIST (the_geom);

-- TABLO_TIPI: DATA
CREATE TABLE tb_ruhsatlar (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_id varchar(50) not null,
    name varchar(255) not null,
    authority varchar(255) not null,
    issue_date date,
    expiry_date date,
    status varchar(50) default 'Alındı',
    geographic_scope varchar(255),
    document_url varchar(255)
);

-- TABLO_TIPI: DATA
CREATE TABLE tb_wbs_gorevler (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_id varchar(50) not null,
    block_id varchar(50),
    wbs_code varchar(50) not null,
    name varchar(255) not null,
    progress numeric(5,2) default 0,
    start_date date,
    end_date date,
    contractor varchar(255),
    planned_quantity numeric(10,2) default 0,
    actual_quantity numeric(10,2) default 0,
    unit varchar(50),
    responsible varchar(150),
    duration_days integer default 0,
    status varchar(50) default 'Talep',
    cost numeric(15,2) default 0
);

-- TABLO_TIPI: DATA
CREATE TABLE tb_dokumanlar (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_id varchar(50) not null,
    block_id varchar(50),
    task_id varchar(50),
    name varchar(255) not null,
    version varchar(50) default 'v1.0',
    file_size varchar(50),
    upload_date date,
    approval_status varchar(50) default 'Approved',
    approver varchar(150)
);

-- TABLO_TIPI: DATA
CREATE TABLE tb_varliklar (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_id varchar(50) not null,
    block_id varchar(50),
    name varchar(255) not null,
    asset_type varchar(50) not null,
    install_date date,
    expected_life_years integer default 20,
    warranty_status varchar(100),
    manufacturer varchar(150),
    tech_doc_url varchar(255),
    maintenance_cost numeric(15,2) default 0,
    energy_cost numeric(15,2) default 0,
    status varchar(50) default 'Sorunsuz',
    last_maintenance_date date
);

-- TABLO_TIPI: DATA
CREATE TABLE tb_bakim_kayitlari (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    asset_id integer not null,
    maintenance_date date not null,
    log_type varchar(100) not null,
    description text,
    cost numeric(15,2) default 0,
    technician varchar(150),
    status varchar(50) default 'Açık'
);

-- TABLO_TIPI: DATA
CREATE TABLE tb_bildirimler (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    project_id varchar(50),
    notification_type varchar(50) default 'info',
    message text not null,
    notification_date timestamp without time zone default current_timestamp,
    is_read boolean default false
);

-- TABLO_TIPI: DATA
CREATE TABLE tb_personel (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    full_name varchar(150) not null,
    email varchar(150) unique not null,
    role varchar(150) not null,
    department varchar(100) not null,
    phone varchar(50),
    user_role varchar(50) default 'standart_user',
    allocation_percentage integer default 100,
    avatar_url varchar(255)
);

-- TABLO_TIPI: DATA
CREATE TABLE tb_yetkiler (
    id serial primary key,
    notes text,
    row_status integer default 1,
    create_uid integer,
    create_date timestamp without time zone default current_timestamp,
    write_uid integer,
    write_date timestamp without time zone,
    user_id integer not null references tb_personel(id) on delete cascade,
    user_name varchar(150) not null,
    table_or_layer_name varchar(100) not null,
    can_read boolean default true,
    can_write boolean default false,
    can_delete boolean default false,
    can_admin boolean default false
);

INSERT INTO tb_proje_durumlari (notes, row_status, create_uid, code, name) VALUES
('Planlama Aşaması', 1, 1, 'planlama', 'Planlama'),
('İnşaat/Uygulama Aşaması', 1, 1, 'devam_ediyor', 'Devam Ediyor'),
('İşletmeye Alınmış Proje', 1, 1, 'tamamlandi', 'Tamamlandı'),
('Risk/Darboğaz Aşaması', 1, 1, 'kritik', 'Kritik');

INSERT INTO tb_risk_dereceleri (notes, row_status, create_uid, code, name) VALUES
('Düşük Seviye Risk', 1, 1, 'dusuk', 'Düşük'),
('Orta Seviye Risk', 1, 1, 'orta', 'Orta'),
('Yüksek Seviye Risk', 1, 1, 'yuksek', 'Yüksek');

INSERT INTO tb_kullanici_rolleri (notes, row_status, create_uid, code, name, description) VALUES
('Tüm sistem ve şema yönetimi yetkisine sahip yönetici', 1, 1, 'super_user', 'Super User', 'Sistem Yöneticisi & Şema/Yetki Sahibi'),
('İleri düzey veri oluşturma, güncelleme ve analiz yetkisi', 1, 1, 'power_user', 'Power User', 'Gelişmiş Operasyon & Raporlama'),
('Standart okuma ve saha veri giriş kullanıcısı', 1, 1, 'standart_user', 'Standart User', 'Saha / İnceleme Kullanıcısı');

INSERT INTO tb_projeler (notes, row_status, create_uid, project_code, name, location, ada_parsel, area, risk_level, overall_progress, budget, spent, planned_spent, earned_value, status, center_lng, center_lat) VALUES
('İGA Doğu Bölgesi 1. Etap', 1, 1, 'IGA-ETAP-1', 'IGA CITY 1. Etap - Terminal & Ticaret Merkezi', 'İstanbul / Arnavutköy (İGA Doğu Bölgesi)', '4102 / 1', '185.000 m²', 'Düşük', 72.00, 4850.00, 3420.00, 3500.00, 3492.00, 'Devam Ediyor', 28.7680, 41.2680),
('İGA Doğu Bölgesi 2. Etap', 1, 1, 'IGA-ETAP-2', 'IGA CITY 2. Etap - Oteller & Kongre Kompleksi', 'İstanbul / Arnavutköy (İGA Doğu - Fuar Vadisi)', '4105 / 4', '240.000 m²', 'Orta', 54.00, 5400.00, 2850.00, 2920.00, 2916.00, 'Devam Ediyor', 28.7860, 41.2720),
('İGA Doğu Bölgesi 3. Etap', 1, 1, 'IGA-ETAP-3', 'IGA CITY 3. Etap - Lojistik & Kargo Parkı', 'İstanbul / Arnavutköy (İGA Doğu - Kargo Hattı)', '4110 / 12', '320.000 m²', 'Düşük', 88.00, 3200.00, 2816.00, 2800.00, 2816.00, 'Devam Ediyor', 28.7650, 41.2510),
('İGA Doğu Bölgesi 4. Etap', 1, 1, 'IGA-ETAP-4', 'IGA CITY 4. Etap - Havacılık Akademisi & Teknopark', 'İstanbul / Arnavutköy (İGA Doğu - Kampüs)', '4118 / 3', '210.000 m²', 'Yüksek', 24.00, 2900.00, 696.00, 750.00, 696.00, 'Planlama', 28.7880, 41.2540);

INSERT INTO tb_personel (notes, row_status, create_uid, full_name, email, role, department, phone, user_role, allocation_percentage) VALUES
('Sistem Süper Yöneticisi', 1, 1, 'Ahmet Yılmaz', 'ahmet.yilmaz@iga.aero', 'CBS & Sistem Başmimarı', 'Bilgi Teknolojileri & CBS', '+90 532 100 2001', 'super_user', 100),
('Proje Direktörü', 1, 1, 'Murat Erdem', 'murat.erdem@iga.aero', 'Proje Direktörü & Başmühendis', 'Proje Yönetim Ofisi (PMO)', '+90 532 200 3002', 'power_user', 100),
('BIM/GIS Lideri', 1, 1, 'Berrin Yücel', 'berrin.yucel@iga.aero', 'BIM / GIS Koordinatörü', 'Teknik Ofis & CBS', '+90 532 300 4003', 'power_user', 100),
('Elektromekanik Şefi', 1, 1, 'Selim Kara', 'selim.kara@iga.aero', 'Elektromekanik Saha Şefi', 'Saha Operasyonları', '+90 532 400 5004', 'standart_user', 100),
('Mimari Şef', 1, 1, 'Deniz Aktaş', 'deniz.aktas@iga.aero', 'Otel & Fitout Mimari Şefi', 'Mimari Grup', '+90 532 500 6005', 'standart_user', 100);

INSERT INTO tb_yetkiler (notes, row_status, create_uid, user_id, user_name, table_or_layer_name, can_read, can_write, can_delete, can_admin) VALUES
('Tam Yetki', 1, 1, 1, 'Ahmet Yılmaz', 'tb_projeler', true, true, true, true),
('Tam Yetki', 1, 1, 1, 'Ahmet Yılmaz', 'tb_binalar_3d', true, true, true, true),
('Tam Yetki', 1, 1, 1, 'Ahmet Yılmaz', 'tb_altyapi_hatlari', true, true, true, true),
('Tam Yetki', 1, 1, 1, 'Ahmet Yılmaz', 'tb_proje_sinirlari', true, true, true, true),
('Proje Yetkisi', 1, 1, 2, 'Murat Erdem', 'tb_projeler', true, true, false, true),
('Proje Yetkisi', 1, 1, 2, 'Murat Erdem', 'tb_wbs_gorevler', true, true, true, true),
('CBS Katman Yetkisi', 1, 1, 3, 'Berrin Yücel', 'tb_binalar_3d', true, true, true, false),
('CBS Katman Yetkisi', 1, 1, 3, 'Berrin Yücel', 'tb_altyapi_hatlari', true, true, false, false),
('Saha Okuma Yetkisi', 1, 1, 4, 'Selim Kara', 'tb_altyapi_hatlari', true, true, false, false),
('Mimari Okuma Yetkisi', 1, 1, 5, 'Deniz Aktaş', 'tb_binalar_3d', true, false, false, false);

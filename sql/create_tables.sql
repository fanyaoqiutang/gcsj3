-- ========================================================
-- PostGIS 四表建表脚本
-- 执行前: \c chengdu_gis  然后 CREATE EXTENSION postgis;
-- ========================================================

DROP TABLE IF EXISTS walk_edge CASCADE;
DROP TABLE IF EXISTS poi CASCADE;
DROP TABLE IF EXISTS metro_station CASCADE;
DROP TABLE IF EXISTS metro_line CASCADE;

-- ---------- 景点 POI ----------
CREATE TABLE poi (
    gid           SERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    category      VARCHAR(50),
    intro         TEXT,
    image_url     VARCHAR(500),
    stay_min      INTEGER DEFAULT 60,
    flow_index    DECIMAL(3,1) DEFAULT 5.0,
    source        VARCHAR(50),
    geom          GEOMETRY(Point, 4326)
);
CREATE INDEX idx_poi_geom ON poi USING GIST (geom);

-- ---------- 步行路网边 ----------
CREATE TABLE walk_edge (
    gid           SERIAL PRIMARY KEY,
    node_from     VARCHAR(50),
    node_to       VARCHAR(50),
    osm_id        BIGINT,
    road_name     VARCHAR(200),
    road_type     VARCHAR(50),
    length_m      DECIMAL(10,2),
    blocked       BOOLEAN DEFAULT FALSE,
    geom          GEOMETRY(LineString, 4326)
);
CREATE INDEX idx_walk_edge_geom ON walk_edge USING GIST (geom);
CREATE INDEX idx_walk_edge_from ON walk_edge (node_from);
CREATE INDEX idx_walk_edge_to   ON walk_edge (node_to);

-- ---------- 地铁站点 ----------
CREATE TABLE metro_station (
    gid           SERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    line_ids      INTEGER[],
    transfer_min  INTEGER DEFAULT 5,
    transfer      BOOLEAN DEFAULT FALSE,
    geom          GEOMETRY(Point, 4326)
);
CREATE INDEX idx_metro_station_geom ON metro_station USING GIST (geom);

-- ---------- 地铁线路 ----------
CREATE TABLE metro_line (
    gid           SERIAL PRIMARY KEY,
    name          VARCHAR(100),
    color         VARCHAR(20),
    geom          GEOMETRY(LineString, 4326)
);
CREATE INDEX idx_metro_line_geom ON metro_line USING GIST (geom);

-- Ejecutar una sola vez en pgAdmin, conectado a la base de datos de DeportesApp.
-- Conserva los registros históricos: para ellos las anuladas quedan en cero y
-- cantidad_vendida se inicializa con la cantidad previamente registrada.

BEGIN;

ALTER TABLE reservas_borderoux_talonarios
    ADD COLUMN IF NOT EXISTS serie_talonario VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cantidad_anuladas INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cantidad_vendida INTEGER;

UPDATE reservas_borderoux_talonarios
SET cantidad_vendida = cantidad
WHERE cantidad_vendida IS NULL;

ALTER TABLE reservas_borderoux_talonarios
    ALTER COLUMN cantidad_vendida SET NOT NULL,
    ADD CONSTRAINT chk_borderoux_talonarios_anuladas_no_negativas
        CHECK (cantidad_anuladas >= 0),
    ADD CONSTRAINT chk_borderoux_talonarios_vendidas_no_negativas
        CHECK (cantidad_vendida >= 0),
    ADD CONSTRAINT chk_borderoux_talonarios_anuladas_en_rango
        CHECK (cantidad_anuladas <= cantidad),
    ADD CONSTRAINT chk_borderoux_talonarios_vendidas_consistentes
        CHECK (cantidad_vendida = cantidad - cantidad_anuladas);

COMMIT;

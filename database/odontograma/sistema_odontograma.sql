-- Sistema Completo de Odontograma com JSONB
-- Implementação ISO 3950 com estados detalhados

-- ===== ESTRUTURA DO ODONTOGRAMA JSONB =====

-- Exemplo de estrutura JSONB para odontograma:
/*
{
  "dentes": [
    {
      "numero": 11,
      "estado": "sadio",
      "faces": {
        "M": {"estado": "sadio", "procedimentos": []},
        "O": {"estado": "sadio", "procedimentos": []},
        "D": {"estado": "sadio", "procedimentos": []},
        "L": {"estado": "sadio", "procedimentos": []},
        "P": {"estado": "sadio", "procedimentos": []},
        "I": {"estado": "sadio", "procedimentos": []}
      },
      "observacoes": "",
      "implante": false,
      "extraido": false
    }
  ],
  "observacoes_gerais": "",
  "classificacao_maloclusao": "Classe I",
  "tipo_arco": "U",
  "sobremordida": "normal",
  "trespasse": "normal"
}
*/

-- ===== FUNÇÕES PARA MANIPULAÇÃO DO ODONTOGRAMA =====

-- Função para criar odontograma vazio (32 dentes adultos)
CREATE OR REPLACE FUNCTION criar_odontograma_vazio()
RETURNS JSONB AS $$
DECLARE
    odontograma_json JSONB;
    dentes_array JSONB[] := '{}';
    dente_json JSONB;
    i INTEGER;
    dentes_permanentes INTEGER[] := '{11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48}';
    faces TEXT[] := '{M,O,D,L,P,I}';
    face_obj JSONB;
BEGIN
    -- Criar objeto para cada face
    face_obj := jsonb_build_object(
        'estado', 'sadio',
        'procedimentos', '[]'::jsonb,
        'observacoes', ''
    );
    
    -- Criar array de dentes
    FOREACH i IN ARRAY dentes_permanentes
    LOOP
        dente_json := jsonb_build_object(
            'numero', i,
            'estado', 'sadio',
            'faces', jsonb_build_object(
                'M', face_obj,
                'O', face_obj,
                'D', face_obj,
                'L', face_obj,
                'P', face_obj,
                'I', face_obj
            ),
            'observacoes', '',
            'implante', false,
            'extraido', false,
            'mobilidade', 0,
            'sensibilidade', false
        );
        dentes_array := dentes_array || dente_json;
    END LOOP;
    
    odontograma_json := jsonb_build_object(
        'dentes', dentes_array,
        'observacoes_gerais', '',
        'classificacao_maloclusao', 'Classe I',
        'tipo_arco', 'U',
        'sobremordida', 'normal',
        'trespasse', 'normal',
        'linha_media', 'coincidente',
        'curva_spee', 'normal',
        'relacao_canina', 'Classe I',
        'relacao_molar', 'Classe I'
    );
    
    RETURN odontograma_json;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para atualizar estado de um dente
CREATE OR REPLACE FUNCTION atualizar_dente_odontograma(
    p_odontograma JSONB,
    p_dente_numero INTEGER,
    p_novo_estado TEXT,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    dentes_array JSONB[];
    dente_json JSONB;
    i INTEGER;
    encontrado BOOLEAN := false;
BEGIN
    -- Validar estado
    IF p_novo_estado NOT IN ('sadio', 'cariado', 'restaurado', 'extraido', 'implante', 'fraturado', 'absente', 'endodontia') THEN
        RAISE EXCEPTION 'Estado inválido: %', p_novo_estado;
    END IF;
    
    -- Percorrer dentes e atualizar
    FOR i IN 0..jsonb_array_length(p_odontograma->'dentes') - 1
    LOOP
        dente_json := p_odontograma->'dentes'->i;
        IF (dente_json->>'numero')::INTEGER = p_dente_numero THEN
            dente_json := jsonb_set(dente_json, '{estado}', to_jsonb(p_novo_estado));
            IF p_observacoes IS NOT NULL THEN
                dente_json := jsonb_set(dente_json, '{observacoes}', to_jsonb(p_observacoes));
            END IF;
            encontrado := true;
        END IF;
        dentes_array := dentes_array || dente_json;
    END LOOP;
    
    IF NOT encontrado THEN
        RAISE EXCEPTION 'Dente % não encontrado no odontograma', p_dente_numero;
    END IF;
    
    RETURN jsonb_set(p_odontograma, '{dentes}', to_jsonb(dentes_array));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para atualizar face de um dente
CREATE OR REPLACE FUNCTION atualizar_face_dente_odontograma(
    p_odontograma JSONB,
    p_dente_numero INTEGER,
    p_face TEXT,
    p_novo_estado TEXT,
    p_procedimento TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    dentes_array JSONB[];
    dente_json JSONB;
    faces_json JSONB;
    face_json JSONB;
    i INTEGER;
    j INTEGER;
    encontrado BOOLEAN := false;
    procedimentos_array JSONB[];
BEGIN
    -- Validar face
    IF p_face NOT IN ('M', 'O', 'D', 'L', 'P', 'I') THEN
        RAISE EXCEPTION 'Face inválida: %', p_face;
    END IF;
    
    -- Percorrer dentes
    FOR i IN 0..jsonb_array_length(p_odontograma->'dentes') - 1
    LOOP
        dente_json := p_odontograma->'dentes'->i;
        IF (dente_json->>'numero')::INTEGER = p_dente_numero THEN
            faces_json := dente_json->'faces';
            face_json := faces_json->p_face;
            
            -- Atualizar estado da face
            face_json := jsonb_set(face_json, '{estado}', to_jsonb(p_novo_estado));
            
            -- Adicionar procedimento se fornecido
            IF p_procedimento IS NOT NULL THEN
                procedimentos_array := ARRAY(SELECT jsonb_array_elements(face_json->'procedimentos'));
                procedimentos_array := procedimentos_array || jsonb_build_object(
                    'procedimento', p_procedimento,
                    'data', CURRENT_DATE,
                    'executado', false
                );
                face_json := jsonb_set(face_json, '{procedimentos}', to_jsonb(procedimentos_array));
            END IF;
            
            -- Atualizar face no objeto faces
            faces_json := jsonb_set(faces_json, ('{' || p_face || '}')::text[], face_json);
            dente_json := jsonb_set(dente_json, '{faces}', faces_json);
            encontrado := true;
        END IF;
        dentes_array := dentes_array || dente_json;
    END LOOP;
    
    IF NOT encontrado THEN
        RAISE EXCEPTION 'Dente % não encontrado no odontograma', p_dente_numero;
    END IF;
    
    RETURN jsonb_set(p_odontograma, '{dentes}', to_jsonb(dentes_array));
END;
$$ LANGUAGE plpgsql;

-- ===== QUERIES PARA ANÁLISE DO ODONTOGRAMA =====

-- Função para contar dentes por estado
CREATE OR REPLACE FUNCTION contar_dentes_por_estado(
    p_odontograma JSONB,
    p_estado TEXT DEFAULT NULL
)
RETURNS TABLE (estado TEXT, quantidade BIGINT) AS $$
BEGIN
    IF p_estado IS NULL THEN
        RETURN QUERY
        SELECT 
            elem->>'estado' as estado,
            COUNT(*)::BIGINT as quantidade
        FROM jsonb_array_elements(p_odontograma->'dentes') AS elem
        GROUP BY elem->>'estado'
        ORDER BY quantidade DESC;
    ELSE
        RETURN QUERY
        SELECT 
            p_estado as estado,
            COUNT(*)::BIGINT as quantidade
        FROM jsonb_array_elements(p_odontograma->'dentes') AS elem
        WHERE elem->>'estado' = p_estado
        GROUP BY estado;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para buscar dentes com problemas específicos
CREATE OR REPLACE FUNCTION buscar_dentes_com_problemas(
    p_odontograma JSONB,
    p_tipo_problema TEXT
)
RETURNS TABLE (dente_numero INTEGER, estado TEXT, observacoes TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (elem->>'numero')::INTEGER as dente_numero,
        elem->>'estado' as estado,
        elem->>'observacoes' as observacoes
    FROM jsonb_array_elements(p_odontograma->'dentes') AS elem
    WHERE CASE 
        WHEN p_tipo_problema = 'cariados' THEN elem->>'estado' = 'cariado'
        WHEN p_tipo_problema = 'extraidos' THEN elem->>'estado' = 'extraido'
        WHEN p_tipo_problema = 'implantes' THEN (elem->>'implante')::BOOLEAN = true
        WHEN p_tipo_problema = 'com_problemas' THEN elem->>'estado' NOT IN ('sadio', 'restaurado')
        ELSE false
    END
    ORDER BY dente_numero;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para comparar odontogramas (evolução)
CREATE OR REPLACE FUNCTION comparar_odontogramas(
    p_odontograma_anterior JSONB,
    p_odontograma_atual JSONB
)
RETURNS TABLE (
    dente_numero INTEGER,
    mudanca_tipo TEXT,
    estado_anterior TEXT,
    estado_atual TEXT,
    observacoes TEXT
) AS $$
DECLARE
    dente_anterior JSONB;
    dente_atual JSONB;
    i INTEGER;
BEGIN
    FOR i IN 0..jsonb_array_length(p_odontograma_anterior->'dentes') - 1
    LOOP
        dente_anterior := p_odontograma_anterior->'dentes'->i;
        dente_atual := p_odontograma_atual->'dentes'->i;
        
        IF dente_anterior->>'estado' != dente_atual->>'estado' THEN
            dente_numero := (dente_anterior->>'numero')::INTEGER;
            mudanca_tipo := 'mudanca_estado';
            estado_anterior := dente_anterior->>'estado';
            estado_atual := dente_atual->>'estado';
            observacoes := CONCAT('Mudança de estado: ', estado_anterior, ' -> ', estado_atual);
            
            RETURN NEXT;
        END IF;
        
        -- Verificar mudanças nas faces
        IF dente_anterior->'faces' != dente_atual->'faces' THEN
            dente_numero := (dente_anterior->>'numero')::INTEGER;
            mudanca_tipo := 'mudanca_faces';
            estado_anterior := 'faces_alteradas';
            estado_atual := 'faces_atualizadas';
            observacoes := 'Faces do dente foram atualizadas';
            
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===== TRIGGERS PARA AUDITORIA =====

-- Trigger para registrar mudanças no odontograma
CREATE OR REPLACE FUNCTION registrar_mudanca_odontograma()
RETURNS TRIGGER AS $$
DECLARE
    mudancas JSONB;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.estado_dentes IS DISTINCT FROM NEW.estado_dentes THEN
        -- Registrar mudanças em tabela de auditoria
        INSERT INTO odontogramas_auditoria (
            odontograma_id,
            paciente_id,
            dentista_id,
            mudanca_tipo,
            estado_anterior,
            estado_atual,
            data_mudanca
        ) VALUES (
            OLD.id,
            OLD.paciente_id,
            OLD.dentista_id,
            'atualizacao_odontograma',
            OLD.estado_dentes,
            NEW.estado_dentes,
            CURRENT_TIMESTAMP
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_registrar_mudanca_odontograma
    AFTER UPDATE ON odontogramas
    FOR EACH ROW
    EXECUTE FUNCTION registrar_mudanca_odontograma();

-- ===== TABELA DE AUDITORIA =====

CREATE TABLE odontogramas_auditoria (
    id SERIAL PRIMARY KEY,
    odontograma_id INTEGER NOT NULL REFERENCES odontogramas(id),
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id),
    dentista_id INTEGER NOT NULL REFERENCES dentistas(id),
    mudanca_tipo VARCHAR(50) NOT NULL,
    estado_anterior JSONB,
    estado_atual JSONB,
    data_mudanca TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para auditoria
CREATE INDEX idx_odontogramas_auditoria_paciente ON odontogramas_auditoria(paciente_id);
CREATE INDEX idx_odontogramas_auditoria_data ON odontogramas_auditoria(data_mudanca DESC);
CREATE INDEX idx_odontogramas_auditoria_odontograma ON odontogramas_auditoria(odontograma_id);

-- ===== EXEMPLOS DE USO =====

-- Criar odontograma para paciente
/*
INSERT INTO odontogramas (clinica_id, paciente_id, dentista_id, data_avaliacao, estado_dentes)
VALUES (
    1, 
    1, 
    1, 
    CURRENT_DATE,
    criar_odontograma_vazio()
);
*/

-- Atualizar estado de dente específico
/*
UPDATE odontogramas 
SET estado_dentes = atualizar_dente_odontograma(
    estado_dentes,
    16,
    'cariado',
    'Cárie detectada na fossa central'
)
WHERE id = 1;
*/

-- Buscar dentes com problemas
/*
SELECT * FROM buscar_dentes_com_problemas(
    (SELECT estado_dentes FROM odontogramas WHERE id = 1),
    'cariados'
);
*/

-- Contar dentes por estado
/*
SELECT * FROM contar_dentes_por_estado(
    (SELECT estado_dentes FROM odontogramas WHERE id = 1)
);
*/

-- Comparar odontogramas (evolução)
/*
SELECT * FROM comparar_odontogramas(
    (SELECT estado_dentes FROM odontogramas WHERE paciente_id = 1 ORDER BY data_avaliacao LIMIT 1),
    (SELECT estado_dentes FROM odontogramas WHERE paciente_id = 1 ORDER BY data_avaliacao DESC LIMIT 1)
);
*/
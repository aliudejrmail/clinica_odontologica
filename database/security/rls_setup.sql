-- Configuração de Row Level Security para Clínica Odontológica
-- Este script implementa segurança multi-tenant com RLS

-- 1. Criar roles (perfis de usuário)
CREATE ROLE clinica_admin;
CREATE ROLE dentista;
CREATE ROLE recepcionista;
CREATE ROLE paciente;

-- 2. Tabela de usuários com role assignment
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('clinica_admin', 'dentista', 'recepcionista', 'paciente')),
    clinica_id INTEGER NOT NULL,
    dentista_id INTEGER, -- NULL para não-dentistas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de clínicas (multi-tenant)
CREATE TABLE clinicas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de dentistas
CREATE TABLE dentistas (
    id SERIAL PRIMARY KEY,
    clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cro VARCHAR(50) NOT NULL,
    especialidade VARCHAR(100),
    telefone VARCHAR(20),
    email VARCHAR(255),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_cro_clinica UNIQUE (cro, clinica_id)
);

-- 5. Tabela de pacientes
CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    data_nascimento DATE NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
    responsavel_nome VARCHAR(255), -- Para menores de idade
    responsavel_cpf VARCHAR(11),
    responsavel_telefone VARCHAR(20),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de consultas
CREATE TABLE consultas (
    id SERIAL PRIMARY KEY,
    clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    dentista_id INTEGER NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
    data_hora TIMESTAMP NOT NULL,
    duracao_minutos INTEGER DEFAULT 60,
    status VARCHAR(50) NOT NULL CHECK (status IN ('agendada', 'confirmada', 'em_andamento', 'concluida', 'cancelada', 'nao_compareceu')),
    tipo_consulta VARCHAR(100) NOT NULL,
    observacoes TEXT,
    valor_total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela de procedimentos
CREATE TABLE procedimentos (
    id SERIAL PRIMARY KEY,
    clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    valor_base DECIMAL(10,2),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_codigo_clinica UNIQUE (codigo, clinica_id)
);

-- 8. Tabela de procedimentos por consulta
CREATE TABLE consulta_procedimentos (
    id SERIAL PRIMARY KEY,
    consulta_id INTEGER NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
    procedimento_id INTEGER NOT NULL REFERENCES procedimentos(id) ON DELETE CASCADE,
    dente_numero INTEGER, -- ISO 3950 (11-48)
    face VARCHAR(10), -- M O D L P I
    quantidade INTEGER DEFAULT 1,
    valor_unitario DECIMAL(10,2),
    valor_total DECIMAL(10,2),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabela de odontogramas
CREATE TABLE odontogramas (
    id SERIAL PRIMARY KEY,
    clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    dentista_id INTEGER NOT NULL REFERENCES dentistas(id) ON DELETE CASCADE,
    data_avaliacao DATE NOT NULL,
    estado_dentes JSONB NOT NULL, -- Estrutura ISO 3950 com estado de cada dente
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabela de pagamentos
CREATE TABLE pagamentos (
    id SERIAL PRIMARY KEY,
    clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    consulta_id INTEGER NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
    forma_pagamento VARCHAR(50) NOT NULL CHECK (forma_pagamento IN ('dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia', 'cheque')),
    valor DECIMAL(10,2) NOT NULL,
    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parcelas INTEGER DEFAULT 1,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== HABILITAR RLS EM TODAS AS TABELAS =====

-- Clinicas: Apenas admin da clínica pode ver
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinica_isolation ON clinicas
    FOR ALL
    USING (id = current_setting('app.clinica_id')::INTEGER);

-- Pacientes: Visível apenas para mesma clínica
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY paciente_clinica_isolation ON pacientes
    FOR ALL
    USING (clinica_id = current_setting('app.clinica_id')::INTEGER);

-- Dentistas: Visível apenas para mesma clínica
ALTER TABLE dentistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY dentista_clinica_isolation ON dentistas
    FOR ALL
    USING (clinica_id = current_setting('app.clinica_id')::INTEGER);

-- Consultas: Dentista só vê suas consultas, recepcionista vê todas da clínica
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

-- Política para clínica
CREATE POLICY consulta_clinica_isolation ON consultas
    FOR ALL
    USING (clinica_id = current_setting('app.clinica_id')::INTEGER);

-- Política para dentista (só vê próprias consultas)
CREATE POLICY consulta_dentista_isolation ON consultas
    FOR ALL
    USING (
        CASE 
            WHEN current_setting('app.user_role') = 'dentista' 
            THEN dentista_id = current_setting('app.dentista_id')::INTEGER
            ELSE true
        END
    );

-- Procedimentos: Visíveis apenas para mesma clínica
ALTER TABLE procedimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY procedimento_clinica_isolation ON procedimentos
    FOR ALL
    USING (clinica_id = current_setting('app.clinica_id')::INTEGER);

-- Consulta_procedimentos: Segue mesmas regras que consultas
ALTER TABLE consulta_procedimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY consulta_proc_clinica_isolation ON consulta_procedimentos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM consultas c 
            WHERE c.id = consulta_procedimentos.consulta_id 
            AND c.clinica_id = current_setting('app.clinica_id')::INTEGER
            AND (
                current_setting('app.user_role') != 'dentista' 
                OR c.dentista_id = current_setting('app.dentista_id')::INTEGER
            )
        )
    );

-- Odontogramas: Visíveis apenas para mesma clínica e dentista que criou
ALTER TABLE odontogramas ENABLE ROW LEVEL SECURITY;
CREATE POLICY odontograma_clinica_isolation ON odontogramas
    FOR ALL
    USING (
        clinica_id = current_setting('app.clinica_id')::INTEGER
        AND (
            current_setting('app.user_role') != 'dentista' 
            OR dentista_id = current_setting('app.dentista_id')::INTEGER
        )
    );

-- Pagamentos: Recepcionista e admin podem ver
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY pagamento_clinica_isolation ON pagamentos
    FOR ALL
    USING (
        clinica_id = current_setting('app.clinica_id')::INTEGER
        AND current_setting('app.user_role') IN ('clinica_admin', 'recepcionista')
    );

-- ===== FUNÇÕES DE SEGURANÇA =====

-- Função para definir contexto de segurança
CREATE OR REPLACE FUNCTION set_security_context(
    p_clinica_id INTEGER,
    p_user_role TEXT,
    p_dentista_id INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.clinica_id', p_clinica_id::TEXT, true);
    PERFORM set_config('app.user_role', p_user_role, true);
    IF p_dentista_id IS NOT NULL THEN
        PERFORM set_config('app.dentista_id', p_dentista_id::TEXT, true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar contexto
CREATE OR REPLACE FUNCTION clear_security_context() RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.clinica_id', NULL, true);
    PERFORM set_config('app.user_role', NULL, true);
    PERFORM set_config('app.dentista_id', NULL, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== ÍNDICES PARA PERFORMANCE =====

-- Índices para buscas frequentes
CREATE INDEX idx_pacientes_cpf ON pacientes(cpf);
CREATE INDEX idx_pacientes_clinica ON pacientes(clinica_id);
CREATE INDEX idx_consultas_data_hora ON consultas(data_hora);
CREATE INDEX idx_consultas_paciente ON consultas(paciente_id);
CREATE INDEX idx_consultas_dentista ON consultas(dentista_id);
CREATE INDEX idx_consultas_clinica ON consultas(clinica_id);
CREATE INDEX idx_consulta_procedimentos_consulta ON consulta_procedimentos(consulta_id);
CREATE INDEX idx_odontogramas_paciente ON odontogramas(paciente_id);
CREATE INDEX idx_pagamentos_consulta ON pagamentos(consulta_id);

-- Índices para RLS (performance crítica)
CREATE INDEX idx_clinica_id ON clinicas(id);
CREATE INDEX idx_pacientes_clinica_id ON pacientes(clinica_id);
CREATE INDEX idx_dentistas_clinica_id ON dentistas(clinica_id);
CREATE INDEX idx_consultas_clinica_dentista ON consultas(clinica_id, dentista_id);

-- ===== PRIVILÉGIOS =====

-- Conceder privilégios mínimos para cada role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO clinica_admin;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinica_admin;

GRANT SELECT ON pacientes, dentistas, consultas, procedimentos, consulta_procedimentos, odontogramas TO dentista;
GRANT INSERT, UPDATE ON consultas, consulta_procedimentos, odontogramas TO dentista;

GRANT SELECT ON pacientes, dentistas, consultas, procedimentos, consulta_procedimentos, pagamentos TO recepcionista;
GRANT INSERT, UPDATE ON pacientes, consultas, pagamentos TO recepcionista;

GRANT SELECT ON pacientes TO paciente;
GRANT SELECT ON consultas TO paciente;

-- Criar RLS Policy correta para paciente ver apenas suas consultas
CREATE POLICY IF NOT EXISTS paciente_ver_suas_consultas ON consultas
    FOR SELECT USING (paciente_id = current_setting('app.paciente_id')::INTEGER);
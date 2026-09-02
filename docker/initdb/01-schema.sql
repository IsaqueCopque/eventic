CREATE TABLE IF NOT EXISTS usuario
(
    id CHAR(36) NOT NULL,
    primeiro_nome VARCHAR(200) NOT NULL,
    segundo_nome VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL,
    email_confirmado BOOLEAN NOT NULL DEFAULT false,
    senha VARCHAR(200) NOT NULL,
    permissao VARCHAR(100) NOT NULL,
    foto_perfil BYTEA,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT UQ_2863682842e688ca198eb25c124 UNIQUE (email)
);


CREATE TABLE IF NOT EXISTS categoria
(
    id CHAR(36) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    icone VARCHAR(255),

    PRIMARY KEY (id),
    CONSTRAINT UQ_0a9942514087463668e9638bf90 UNIQUE (nome)
);


CREATE TABLE IF NOT EXISTS evento
(
    id CHAR(36) NOT NULL,
    descricao VARCHAR(1000) NOT NULL,
    localizacao VARCHAR(200) NOT NULL,
    datainicial TIMESTAMP NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    destaque BOOLEAN NOT NULL DEFAULT false,
    imagem_url VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    datafinal TIMESTAMP,
    tipo VARCHAR(255),
    link_mais_informacoes VARCHAR(255),
    criador_id CHAR(36) NOT NULL,
    categoria_id CHAR(36),

    PRIMARY KEY (id),

    CONSTRAINT evento_categoria_fk
        FOREIGN KEY (categoria_id)
        REFERENCES categoria (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT evento_usuario_fk
        FOREIGN KEY (criador_id)
        REFERENCES usuario (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS parametro
(
    id CHAR(36) NOT NULL,
    nome VARCHAR(500) NOT NULL,
    valor VARCHAR(255) NOT NULL,

    PRIMARY KEY (id),
    CONSTRAINT nome_unique UNIQUE (nome)
);


CREATE TABLE IF NOT EXISTS recomendacao
(
    id CHAR(36) NOT NULL,
    tipo_recomendacao INT NOT NULL,
    precisao DOUBLE PRECISION,
    usuario_id CHAR(36),
    qt_recomendados INT NOT NULL,

    PRIMARY KEY (id),

    CONSTRAINT recomendacao_usuario_fk
        FOREIGN KEY (usuario_id)
        REFERENCES usuario (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);


CREATE TABLE IF NOT EXISTS evento_recomendado
(
    id CHAR(36) NOT NULL,
    recomendacao_id CHAR(36),
    evento_id CHAR(36),

    PRIMARY KEY (id),

    CONSTRAINT evento_recomendado_evento_fk
        FOREIGN KEY (evento_id)
        REFERENCES evento (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,

    CONSTRAINT evento_recomendado_recomendacao_fk
        FOREIGN KEY (recomendacao_id)
        REFERENCES recomendacao (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);


CREATE TABLE IF NOT EXISTS avaliacao
(
    id CHAR(36) NOT NULL,
    nota SMALLINT NOT NULL,
    comentario VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    usuario_id CHAR(36),
    evento_id CHAR(36),

    PRIMARY KEY (id),

    CONSTRAINT avaliacao_evento_fk
        FOREIGN KEY (evento_id)
        REFERENCES evento (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT avaliacao_usuario_fk
        FOREIGN KEY (usuario_id)
        REFERENCES usuario (id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
);


CREATE TABLE IF NOT EXISTS inscricao
(
    id CHAR(36) NOT NULL,
    notificar_em VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    batch_id VARCHAR(255) NOT NULL,
    batch_status VARCHAR(255) NOT NULL DEFAULT 'active',
    evento_id CHAR(36),
    usuario_id CHAR(36),

    PRIMARY KEY (id),

    CONSTRAINT inscricao_evento_fk
        FOREIGN KEY (evento_id)
        REFERENCES evento (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,

    CONSTRAINT inscricao_usuario_fk
        FOREIGN KEY (usuario_id)
        REFERENCES usuario (id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
);
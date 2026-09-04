import { Column, Entity, OneToMany, PrimaryGeneratedColumn, Relation, Unique } from "typeorm";
import { Evento } from "@app/server/entities/evento.entity"
import { Inscricao } from "@app/server/entities/inscricao.entity";
import { Avaliacao } from "./avaliacao.entity";

@Entity("usuario", { schema: "public" })
@Unique('email_unique', ['email'])
export class Usuario {
  /**
   * Cria Usuario a partir de objeto
   */
  public static createFromObj(obj: any):Usuario {
    const usuario = new Usuario();
    const { primeiro_nome, segundo_nome, email, senha, permissao, foto_perfil } = obj;

    usuario.primeiroNome = primeiro_nome;
    usuario.segundoNome = segundo_nome;
    usuario.email = email.toLocaleLowerCase();
    usuario.senha = senha;
    usuario.permissao = permissao;
    if (foto_perfil) usuario.fotoPerfil = foto_perfil;
    usuario.createdAt = new Date();

    return usuario;
  }

  @PrimaryGeneratedColumn("uuid", { name: "id", primaryKeyConstraintName: "usuario_pkey" })
  id: string;

  @Column("character varying", { name: "primeiro_nome", length: 200 })
  primeiroNome: string;

  @Column("character varying", { name: "segundo_nome", length: 200 })
  segundoNome: string;

  @Column("character varying", { name: "email", unique: true, length: 100 })
  email: string;

  @Column("boolean", { name: "email_confirmado", default: false })
  emailConfirmado: boolean;

  @Column("character varying", { name: "senha", length: 200 })
  senha: string;

  @Column("character varying", { name: "permissao", length: 100 })
  permissao: Permissao;

  @Column("bytea", {
    name: "foto_perfil",
    nullable: true,
    transformer: {
      to: (value: string) => {
        if (value)
          return Buffer.from(value)
      },
      from: (value: Buffer) => {
        if (value)
          return value?.toString()
      }
    }
  })
  fotoPerfil: string | null;

  @Column("timestamp without time zone", { name: "created_at", default: new Date() })
  createdAt: Date;

  @Column("timestamp without time zone", { name: "updated_at", nullable: true, default: new Date() })
  updatedAt: Date | null;

  @OneToMany(() => Evento, (evento) => evento.criador)
  eventos: Relation<Evento>[];

  @OneToMany(() => Inscricao, (inscricao) => inscricao.usuario)
  inscricaos: Inscricao[];

  @OneToMany(
    () => Avaliacao,
    (avaliacao) => avaliacao.usuario
  )
  avaliacoes: Avaliacao[];

}
import { CustomForm } from "@app/helpers/CustomForm";
import { Validator } from "@app/helpers/Validator";
import { Grid, CircularProgress, Box, Modal, Typography } from "@mui/material";
import styles from "./cadastro.module.css";
import Image from "next/image";
import { NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { CadastroUsuarioForm } from "@app/components/cadastrousuarioform/CadastroUsuarioForm";
import { UsuarioAPI } from "@app/apis/UsuarioAPI";
import { toBase64 } from "@app/helpers/Helpers";
import { Session, getServerSession } from "next-auth";
import { Usuario } from "@app/server/entities/usuario.entity";
import { FormMode } from "@app/common/constants";
import { authOptions } from "../api/auth/[...nextauth]";

interface CadastroUsuarioProps {
  usuario?: Usuario;
}

const CadastroUsuario: NextPage<CadastroUsuarioProps> = (
  props: CadastroUsuarioProps
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [formMode, setFormMode] = useState(FormMode.CREATE);
  const [formErrorMessage, setFormErrorMessage] = useState("");
  const session = useSession();
  const router = useRouter();
  const [cadastroSuccess, setCadastroSuccess] = useState(true);

  const style = {
    position: "absolute" as "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
  };

  useEffect(() => {
    if (props.usuario) {
      //setIsLoading(true);
      setFormState(getFormInit(props.usuario));
      setFormMode(FormMode.EDIT);
    } else {
      setFormState(getFormInit());
    }
  }, [props.usuario]);

  const getFormInit = (usuario?: Usuario): Map<string, FormFieldState> => {
    return new Map([
      [
        "nome",
        {
          value: usuario?.primeiroNome ?? "",
          validators: [Validator.required],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "sobrenome",
        {
          value: usuario?.segundoNome ?? "",
          validators: [Validator.required],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "email",
        {
          value: usuario?.email ?? "",
          validators: [Validator.required, Validator.email],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "senha",
        {
          value: "",
          validators: usuario ? [Validator.tamanho(6)] : [Validator.tamanho(6), Validator.required],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "celular",
        {
          value: "",
          validators: [],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "cpf",
        {
          value: "",
          validators: [],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "imagem",
        {
          value: undefined,
          validators: [],
          valid: true,
          errorMessage: "",
        },
      ],
    ]);
  };

  const [formState, setFormState] = useState(getFormInit());
  const formInstance = new CustomForm(formState, setFormState);

  const redirectoToLogin = () => {
    router.push("/auth/login");
  };
  const onCadastroSubmit = async (e: Event) => {
    if (!formInstance.validateForm()) {
      return;
    }

    setIsLoading(true);
    setCadastroSuccess(true);

    const fotoPerfil = formInstance.getValue("imagem");
    let base64: string = "";

    if (fotoPerfil) {
      base64 = (await toBase64(
        formInstance.getValue("imagem") as File
      )) as string;
    }

    const usuarioRequest: any = {
      primeiro_nome: formInstance.getValue("nome") as string,
      segundo_nome: formInstance.getValue("sobrenome") as string,
      email: formInstance.getValue("email") as string,
      senha: formInstance.getValue("senha") as string,
      permissao: "visitante",
      foto_perfil: base64 as string,
    };

    let usuarioRequestPromise =
      formMode == FormMode.EDIT
        ? UsuarioAPI.editar({ ...usuarioRequest, id: props.usuario?.id })
        : UsuarioAPI.cadastrar(usuarioRequest);

    usuarioRequestPromise
      .catch((error) => {
        setCadastroSuccess(false);
      })
      .then((response) => {
        if (response.errorMsg) {
          setCadastroSuccess(false);
          setFormErrorMessage(response.errorMsg);
          return;
        }
        if (props.usuario?.email !== formInstance.getValue('email')) {
          setOpenModal(true);
        }

        if(formMode == FormMode.EDIT){
          router.push('/auth/meucadastro')
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className={styles.cadastro}>
      <div>
        <Modal open={openModal} onClose={redirectoToLogin}>
          <Box sx={style}>
            <Typography id="modal-modal-title" variant="h6" component="h2">
              Validação de e-mail
            </Typography>
            <Typography id="modal-modal-description" sx={{ mt: 2 }}>
              Valide sua usando o link que enviamos para o seu e-mail.
            </Typography>
          </Box>
        </Modal>
      </div>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        <Grid item md={6} xs={0}>
          <div className={styles.imagem}>
            <Image
              src="/amico.png"
              alt="login"
              width="0"
              height="0"
              sizes="100vw"
              style={{ width: "70%", height: "auto" }}
            />
          </div>
        </Grid>
        <Grid item xs={12} md={6}>
          <div className={styles.cadastro__form}>
            <h2>{ props.usuario ? 'Atualizar' : 'Cadastrar' } Usuario</h2>
            {isLoading ? (
              <div className="loader">
                <CircularProgress />
              </div>
            ) : (
              <CadastroUsuarioForm
                isCadastroSuccess={cadastroSuccess}
                onCadastroSubmit={onCadastroSubmit}
                formInstance={formInstance}
                errorMessage={formErrorMessage}
                usuario={props.usuario}
              />
            )}
          </div>
        </Grid>
      </Grid>
    </div>
  );
};

export const getServerSideProps = async (context: any) => {
  const session: Session | null = await getServerSession(
    context.req,
    context.res,
    authOptions
  );
  if (session) {
    const cookies = Object.keys(context.req.cookies).map((key) => {
      return `${key}=${context.req.cookies[key]}`
    }).join("; ");
    const apiURL = process.env.NEXT_PUBLIC_URL;
    const res = await fetch(`${apiURL}/api/usuarios/perfil`, {
      headers: {"Cookie": cookies}
    });
    const data = await res.json();

    return {
      props: { usuario: data},
    };
  }

  return { props: {} };
};

export default CadastroUsuario;

import { CustomForm } from "@app/helpers/CustomForm";
import { Validator } from "@app/helpers/Validator";
import { Grid, CircularProgress } from "@mui/material";
import styles from "./cadastro.module.css";
import Image from "next/image";
import { NextPage } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { CadastroEventoForm } from "@app/components/cadastroeventoform/CadastroEventoForm";
import { EventoAPI } from "@app/apis/EventoAPI";
import dayjs, { Dayjs } from "dayjs";
import { getServerSession } from "next-auth";
import { juntarDataHorario, toBase64 } from "@app/helpers/Helpers";
import { Evento } from "@app/server/entities/evento.entity";
import { FormMode } from "@app/common/constants";

interface CadastroEventoProps {
  evento: Evento;
}

const CadastroEvento: NextPage<CadastroEventoProps> = (
  props: CadastroEventoProps
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState("");
  const session = useSession();
  const router = useRouter();
  let formMode = props.evento ? FormMode.EDIT : FormMode.CREATE;

  const getFormInit = (evento?: Evento): Map<string, FormFieldState> => {
    return new Map([
      [
        "titulo",
        {
          value: evento?.titulo ?? "",
          validators: [Validator.required],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "local",
        {
          value: evento?.localizacao ?? "",
          validators: [Validator.required],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "dataInicio",
        {
          value: evento?.dataInicial
            ? dayjs(evento?.dataInicial)
            : dayjs(new Date()),
          validators: [Validator.date],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "horarioInicio",
        {
          value: evento?.dataInicial
            ? dayjs(evento?.dataInicial)
            : dayjs(new Date()),
          validators: [Validator.date],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "dataFim",
        {
          value: "",
          validators: [],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "horarioFim",
        {
          value: "",
          validators: [],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "categoria",
        {
          value: (evento?.categoria?.nome as string) ?? "",
          validators: [],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "tipo",
        {
          value: evento?.tipo ?? "",
          validators: [],
          valid: true,
          errorMessage: "",
        },
      ],
      [
        "descricao",
        {
          value: evento?.descricao ?? "",
          validators: [Validator.required],
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
  const [cadastroSuccess, setCadastroSuccess] = useState(true);

  let formInstance: CustomForm = new CustomForm(formState, setFormState);
  useEffect(() => {
    if (formMode == FormMode.EDIT) {
      //setIsLoading(true);
      setFormState(getFormInit(props.evento));
    } else {
      setFormState(getFormInit());
    }
  }, [formMode, props.evento]);

  const onCadastroSubmit = async (e: Event) => {
    if (!formInstance.validateForm()) {
      console.log(formState);
      return;
    }

    setIsLoading(true);

    const imagem = formInstance.getValue("imagem");
    let base64: string = "";

    if (imagem) {
      base64 = (await toBase64(
        formInstance.getValue("imagem") as File
      )) as string;
    }

    let request: Promise<any>;

    if (formMode == FormMode.EDIT) {
      request = EventoAPI.editar({
        id: props.evento.id,
        titulo: formInstance.getValue("titulo") as string,
        tipo: formInstance.getValue("tipo") as string,
        descricao: formInstance.getValue("descricao") as string,
        localizacao: formInstance.getValue("local") as string,
        data_inicial: juntarDataHorario(
          formInstance.getValue("dataInicio") as Dayjs,
          formInstance.getValue("horarioInicio") as Dayjs
        ).toISOString(),
        usuario_id: session.data?.user.id ?? "1",
        imagem: base64 as string,
        imagem_url: "url",
      });
    } else {
      request = EventoAPI.cadastrar({
        titulo: formInstance.getValue("titulo") as string,
        tipo: formInstance.getValue("tipo") as string,
        descricao: formInstance.getValue("descricao") as string,
        localizacao: formInstance.getValue("local") as string,
        data_inicial: juntarDataHorario(
          formInstance.getValue("dataInicio") as Dayjs,
          formInstance.getValue("horarioInicio") as Dayjs
        ).toISOString(),
        usuario_id: session.data?.user.id ?? "1",
        imagem: base64 as string,
        imagem_url: "url",
      });
    }

    request
      ?.catch((error) => {
        setFormErrorMessage(error.response.data.errorMsg);
        setIsLoading(false);
      })
      .then((response) => {
        if (response) {
          router.push("/");
        }
      });
  };

  return (
      <div className={styles.cadastro}>
        <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
          <Grid item md={6} xs={0}>
            <div className={styles.imagem}>
              <Image
                src="/pana.png"
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
              <h2>
                {formMode == FormMode.EDIT ? "Atualizar" : "Cadastrar"} Evento
              </h2>
              {isLoading ? (
                <div className="loader">
                  <CircularProgress />
                </div>
              ) : (
                <CadastroEventoForm
                  errorMessage={formErrorMessage}
                  isCadastroSuccess={cadastroSuccess}
                  onCadastroSubmit={onCadastroSubmit}
                  formInstance={formInstance}
                  formMode={formMode}
                />
              )}
            </div>
          </Grid>
        </Grid>
      </div>
  );
};

export const getServerSideProps = async (context: any) => {
  const session = await getServerSession(context.req, context.res, {});
  if (!session) {
    return {
      props: {},
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  const { id } = context.query;
  let data: Evento[] = [];

  if (id) {
    const apiURL = process.env.NEXT_PUBLIC_URL;
    const res = await fetch(`${apiURL}/api/eventos?id=${id}`);
    data = await res.json();
  }

  return { props: { evento: data[0] ?? null } };
};

export default CadastroEvento;

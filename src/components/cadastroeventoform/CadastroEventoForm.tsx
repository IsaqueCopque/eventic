import {
  Alert,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import styles from "./cadastroeventoform.module.css";
import { CustomForm } from "@app/helpers/CustomForm";
import { FunctionComponent, useEffect, useState } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import { CategoriaAPI } from "@app/apis/CategoriaAPI";
import { Categoria } from "@app/server/entities/categoria.entity";
import { FormMode } from "@app/common/constants";

interface CadastroEventoFormProps {
  formInstance: CustomForm;
  isCadastroSuccess: boolean;
  onCadastroSubmit: any;
  errorMessage: string;
  formMode: FormMode;
}

export const CadastroEventoForm: FunctionComponent<CadastroEventoFormProps> = (
  props: CadastroEventoFormProps
) => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    CategoriaAPI.getCategorias().then((response) => {
      setCategorias(response);
    });
  }, []);

  return (
    <>
      {!props.isCadastroSuccess && (
        <Alert severity="error">{props.errorMessage}</Alert>
      )}
      <div className={styles.cadastro}>
        <TextField
          sx={{marginTop:'1rem'}}
          error={!props.formInstance.isValid("titulo")}
          id="titulo"
          value={props.formInstance.getValue("titulo")}
          onChange={props.formInstance.onInputChange}
          helperText={props.formInstance.getErrorMessage("titulo")}
          label="Título"
        />
        <TextField
          sx={{marginTop:'1rem'}}
          error={!props.formInstance.isValid("local")}
          id="local"
          value={props.formInstance.getValue("local")}
          onChange={props.formInstance.onInputChange}
          helperText={props.formInstance.getErrorMessage("local")}
          label="Local"
        />

        <div className={styles.data}>
          <h4>Data início</h4>
          <Grid
            container
            rowSpacing={1}
            columnSpacing={{ xs: 1, sm: 2, md: 3 }}
          >
            <Grid item className={styles.dataItem}>
              <DatePicker
                label="Data"
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    className: styles.dataInput,
                    error: !props.formInstance.isValid("dataInicio"),
                    helperText:
                      props.formInstance.getErrorMessage("dataInicio"),
                  },
                }}
                value={props.formInstance.getValue("dataInicio")}
                onChange={(value) => {
                  props.formInstance.onDateInputChange(
                    dayjs(value as dayjs.Dayjs),
                    "dataInicio"
                  );
                }}
              />
            </Grid>
            <Grid item className={styles.dataItem}>
              <TimePicker
                label="Horário"
                ampm={false}
                slotProps={{
                  textField: {
                    className: styles.dataInput,
                    error: !props.formInstance.isValid("horarioInicio"),
                    helperText:
                      props.formInstance.getErrorMessage("horarioInicio"),
                  },
                }}
                value={props.formInstance.getValue("horarioInicio")}
                onChange={(value) => {
                  props.formInstance.onDateInputChange(
                    dayjs(value as dayjs.Dayjs),
                    "horarioInicio"
                  );
                }}
              />
            </Grid>
          </Grid>
        </div>
        {/* <div className={styles.data}>
          <h4>Data fim</h4>
          <Grid
            container
            rowSpacing={1}
            columnSpacing={{ xs: 1, sm: 2, md: 3 }}
          >
            <Grid item className={styles.dataItem}>
              <DatePicker
                label="Data"
                format="DD/MM/YYYY"
                slotProps={{ textField: { className: styles.dataInput } }}
                value={props.formInstance.getValue("dataFim")}
                onChange={(value) => {
                  props.formInstance.onDateInputChange(
                    dayjs(value as dayjs.Dayjs),
                    "dataFim"
                  );
                }}
              />
            </Grid>
            <Grid item className={styles.dataItem}>
              <TimePicker
                label="Horário"
                ampm={false}
                slotProps={{ textField: { className: styles.dataInput } }}
                value={props.formInstance.getValue("horarioFim")}
                onChange={(value) => {
                  props.formInstance.onDateInputChange(
                    dayjs(value as dayjs.Dayjs),
                    "horarioFim"
                  );
                }}
              />
            </Grid>
          </Grid>
        </div> */}
        <Select
          label="Categoria"
          error={!props.formInstance.isValid("categoria")}
          name="categoria"
          value={props.formInstance.getValue("categoria")}
          onChange={props.formInstance.onInputChange}
        >
          {categorias.map((categoria) => (
            <MenuItem value={categoria.id} selected={true} key={categoria.id}>
              {categoria.nome}
            </MenuItem>
          ))}
        </Select>
        <TextField
          sx={{marginTop:'1rem'}}
          label="Tipo"
          error={!props.formInstance.isValid("tipo")}
          id="tipo"
          value={props.formInstance.getValue("tipo")}
          onChange={props.formInstance.onInputChange}
          helperText={props.formInstance.getErrorMessage("tipo")}
        />
        <TextField
          sx={{marginTop:'1rem'}}
          label="Descrição"
          placeholder="Descrição"
          rows={5}
          error={!props.formInstance.isValid("descricao")}
          id="descricao"
          value={props.formInstance.getValue("descricao")}
          onChange={props.formInstance.onInputChange}
          helperText={props.formInstance.getErrorMessage("descricao")}
          multiline
        />
        <div className={styles.data}>
          <h4>Upload de imagem</h4>
          <input
            type="file"
            id="imagem"
            className={styles.fileInput}
            onChange={props.formInstance.onFileChange}
          />
        </div>
        <Button
          sx={{marginTop:'1rem'}}
          variant="contained"
          color="success"
          onClick={props.onCadastroSubmit}
        >
          { props.formMode == FormMode.EDIT ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </div>
    </>
  );
};

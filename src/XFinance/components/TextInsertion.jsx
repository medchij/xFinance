import * as React from "react";
import { useState } from "react";
import { Button, Field, Textarea, tokens, makeStyles } from "@fluentui/react-components";
import PropTypes from "prop-types";
import { useAppContext } from "./AppContext";

const useStyles = makeStyles({
  instructions: {
    fontWeight: tokens.fontWeightSemibold,
    marginTop: "12px", // Зайг багасгав
    marginBottom: "8px", // Зайг багасгав
    fontSize: tokens.fontSizeBase200,
  },
  textPromptAndInsertion: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontSize: tokens.fontSizeBase200,
  },
  textAreaField: {
    marginLeft: "16px", // Зайг багасгав
    marginTop: "16px", // Зайг багасгав
    marginBottom: "12px", // Зайг багасгав
    marginRight: "16px", // Зайг багасгав
    maxWidth: "60%", // Өргөнийг бага зэрэг нэмэв
    fontSize: tokens.fontSizeBase200,
  },
});

const TextInsertion = (props) => {
  const [text, setText] = useState("Идэвхитэй нүдэнд текст оруулах.");
  const { setLoading, showMessage } = useAppContext();

  const handleTextInsertion = async () => {
    await props.insertText(text, showMessage, setLoading);
  };

  const handleTextChange = async (event) => {
    setText(event.target.value);
  };

  const styles = useStyles();

  return (
    <div className={styles.textPromptAndInsertion}>
      <Field className={styles.textAreaField} size="large" label="Баримт бичигт оруулах текстийг оруулна уу.">
        <Textarea size="large" value={text} onChange={handleTextChange} />
      </Field>
      <Field className={styles.instructions}>Туршиж үзэх товчийг дарна уу.</Field>
      <Button
        appearance="primary"
        disabled={false}
        size="large"
        onClick={handleTextInsertion}
        style={{ marginBottom: "24px" }}
      >
        Туршиж үзэх
      </Button>
    </div>
  );
};

TextInsertion.propTypes = {
  insertText: PropTypes.func.isRequired,
};

export default TextInsertion;

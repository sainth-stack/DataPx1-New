import React, { useEffect, useState } from "react";
import styles from "./styles/AnswersAccordion.module.css"; // CSS for professional styling
import { CircularProgress, Button } from "@mui/material";

import botImage from "../assets/images/botImage.jpg"
import Plot from "react-plotly.js";
const AnswersChat2 = ({
  question,
  answer,
  loading,
  type,
  graph,
  name = "savedImages",
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const imageUrl = answer;

  useEffect(() => {
    const savedImages = JSON.parse(localStorage.getItem(name) || "[]");
    setIsSaved(savedImages.includes(imageUrl));
  }, [imageUrl, name]);

  const saveImage = () => {
    let savedImages = JSON.parse(localStorage.getItem(name) || "[]");
    if (!savedImages.includes(imageUrl)) {
      savedImages.push(imageUrl);
      localStorage.setItem(name, JSON.stringify(savedImages));
      setIsSaved(true);
    }
  };
  return (
  <>
{!loading&& <>
  {(answer)?   <div className={styles.chatContainer}>
      {/* Question Section */}
      {/* <div className={`${styles.chatMessage} ${styles.question}`}>
        <strong>{question}</strong>
      </div> */}

      {/* Answer Section */}
      

      {loading ? (
        <div className={styles.loadingContainer}>
          <CircularProgress size={32} color="primary" />
        </div>
      ) : (
<>
   <div className={`${styles.chatMessage} ${styles.answer}`}> 
         <div>
           <img
             src={botImage}
             width={30} // Adjusted size for better appearance
             height={30}
             alt="Bot"
             style={{
               borderRadius: "50%", // Makes the image circular
               background: "none",
               margin: ".3rem",
               boxShadow:"1px gray"// Removes any background
             }}
           />
           {answer}
         </div> 
     </div> </>
      )}
    </div> :
     <div style={{width:'100%',maxWidth:'100%'}}>
    <Plot
                  data={graph?.data}
                  layout={graph?.layout}
                  config={{ responsive: true }}
                  style={{
                    width: "100%",
                    height: "60vh",
                    borderRadius: "0",
                    boxShadow: "none",
                  }}
                />
    </div>
          }
</>}
    <>
    {loading &&     <div className={styles.loadingContainer}>
          <CircularProgress size={32} color="primary" />
        </div>}
    </>
  </>
  );
};

export default AnswersChat2;

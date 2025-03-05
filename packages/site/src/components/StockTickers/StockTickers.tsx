import type { FC } from "react";
import { StartStopControls } from "./StartStopControls";
import { Stocks } from "./Stocks";
import { TickersProvider } from "./TickersProvider";
// import { Visualizer } from "./Visualizer";
import "./StockTickers.css";

export const StockTickers: FC = () => {
  return (
    <div className="stock-tickers not-content">
      <TickersProvider>
        <StartStopControls />
        <div className="dog-stocks">
          <svg xmlns="http://www.w3.org/2000/svg" width="125" height="100">
            <path
              xmlns="http://www.w3.org/2000/svg"
              style={{
                transform: "translateX(-50px) translateY(-340px)",
                fill: "var(--sl-color-accent)",
              }}
              d="M154.044,385.346c0,0,1.579-6.189,1.093-9.348c-0.486-3.156-0.757-7.404-0.5-12.141   c0.257-4.734,0.621-7.285,2.321-7.164c0,0,3.061,0.645,3.958-0.254c0.897-0.897,3.886,1.248,6.727-1.094   c2.84-2.344,3.04-1.195,3.438-2.592c0.399-1.397,2.792-6.678,0.299-7.076c-2.492-0.4-9.717-0.846-10.564-1.943   c-0.847-1.096-0.947-3.088-2.242-3.238c-1.296-0.15-10.217-3.338-14.303,0.647c-4.086,3.986-4.933,13.506-6.777,15.199   c-1.844,1.695-7.724,3.488-10.315,6.977c-2.591,3.488-21.677,1.842-28.255,2.092c-6.578,0.25-17.89,4.037-22.574,11.461   c-4.685,7.426-4.036,10.814-9.518,16.047c-5.482,5.232-18.788,12.557-18.887,20.58c0,0,17.691-2.096,19.883-5.932   c2.193-3.836,1.844-5.48,1.844-5.48s0.449,0.447,0.249,1.195c-0.2,0.748-1.445,6.977-2.94,8.67   c-1.495,1.695-3.338,3.938-3.239,4.934c0.1,0.996-1.745,19.336,0.498,21.18c2.243,1.844,6.828,1.246,6.878,0.199   c0.05-1.047-1.396-2.74-2.542-2.791c-1.146-0.051-2.242-3.438-1.794-5.383c0.448-1.943,0.946-10.414,4.336-13.303   c3.389-2.891,7.026-6.131,7.873-7.475c0.847-1.346,5.729-6.877,5.979-7.426c0,0,1.445,7.076,0.548,10.016   c-0.897,2.941-1.496,4.236,0.298,8.422c1.794,4.186,5.73,12.309,8.422,13.305c2.691,0.996,6.578,0.25,6.029-0.598   c-0.548-0.848-2.043-3.389-2.841-3.389c-0.797,0-1.495,0.896-2.591-1.346c-1.096-2.242-3.289-5.232-3.04-9.27   c0.249-4.035,0.399-5.48,1.246-6.775c0.847-1.297,5.231-10.861,6.378-12.358c1.146-1.496,3.19-1.945,4.286-1.695   s13.554,0.551,15.697-0.447c2.143-0.996,5.781,2.043,6.029,3.189c0.249,1.146,4.933,1.494,5.98,6.826   c1.047,5.334,4.085,15.549,4.733,19.037c0.648,3.488,3.937,12.287,6.229,12.447c2.293,0.16,7.425,0.26,6.827-0.986   c-0.598-1.246-2.74-3.588-3.986-3.537c-1.246,0.049-2.143-0.6-2.292-1.248c-0.15-0.646-2.292-6.029-2.292-7.473   c0-1.445-1.495-7.475-1.295-9.27c0.2-1.793,0.598-5.434,0.697-6.729c0.1-1.295-0.349-5.48,0.1-6.129   c0.448-0.646,2.641-1.246,2.541,2.592c-0.099,3.838,2.541,16.893,3.089,18.785c0.548,1.895,3.887,8.523,4.934,9.32   c1.046,0.797,2.293,1.943,3.538,1.744c1.246-0.199,1.594-0.748,2.84-0.699c1.246,0.051,2.741-0.148,2.292-1.096   c-0.448-0.945-1.993-3.238-3.189-2.891c-1.196,0.35-2.043,1.346-2.89-0.199c-0.847-1.545-3.09-4.684-3.588-6.777   c-0.499-2.092-1.097-13.9-1.046-15.844c0.05-1.943-1.694-7.377-1.146-8.422C148.055,399.348,153.381,388.465,154.044,385.346z"
            />
          </svg>
          <Stocks />
        </div>
        <div className="dog-stocks">
          <Stocks />
          <svg xmlns="http://www.w3.org/2000/svg" width="141" height="105">
            <path
              xmlns="http://www.w3.org/2000/svg"
              style={{
                transform: "translateX(-40px) translateY(-45px)",
                fill: "var(--sl-color-accent-high)",
              }}
              d="M81.243,58.702c0,0-11.969-9.703-12.536-10.553c-0.566-0.85-4.461-4.32-11.331-1.275   c-6.87,3.045-6.162,4.815-7.012,6.09c-0.85,1.275-7.365,5.95-9.773,7.295c-2.408,1.345,0.921,3.612,1.487,4.391   c0.566,0.779,4.532,4.957,9.136,3.895c0,0-3.4,6.304-1.417,7.72c0,0,0.78-1.417,0.921-2.054c0,0,2.549,1.559,4.674-0.141   s8.003-8.287,10.907-5.595c2.903,2.691,7.507,7.648,8.64,12.11c1.133,4.461,2.833,13.032,5.523,17.848   c2.691,4.816,3.825,11.473,4.25,14.66c0.425,3.187,2.761,20.962,0.566,26.841c-2.196,5.878-4.391,5.029-4.249,5.949   c0.142,0.92,5.879,0.567,6.941-0.92c1.062-1.487,2.62-5.949,4.178-6.232l-1.417,1.982c-0.212,1.275,4.887,0.85,5.241-0.071   s0.354-6.162,1.7-6.445c1.346-0.283,1.558-0.85,1.204-1.983c-0.354-1.133-2.479-12.747-2.054-16.359   c0.425-3.612,0.071-9.703,0.071-9.703s19.121-3.257,23.584-7.648c4.462-4.391,18.555-8.781,20.963-1.983   c2.408,6.799,3.896,14.588,9.49,20.396c5.595,5.808,8.356,8.64,9.843,12.394c1.487,3.753,2.479,12.251,1.983,13.88   c-0.496,1.629-3.045,5.453-3.187,6.232c-0.142,0.779,1.463,0.78,3.316,0.425c1.854-0.355,3.695,0.92,3.695-0.355   c0-1.274,0.212-6.798,0.708-9.986c0.496-3.187,2.975-9.985,2.62-10.693c0,0,0.282-1.487,0.035-2.054   c-0.247-0.566-2.655-3.257-4.354-5.594c-1.7-2.337-6.516-8.498-6.728-11.331c-0.212-2.833-0.142-11.828,0.85-15.369   s0.78-7.932,0.496-9.561c-0.283-1.629,1.629,2.833,2.054,3.966c0.425,1.133,1.204,3.966,3.257,5.595s4.957,4.107,11.543,4.249   c0,0,1.274,0.425,2.337,0.496s1.912-1.275,0.779-1.912c-1.133-0.637-1.416-1.629-3.47-1.205c-2.054,0.425-6.658-0.07-9.349-5.948   c-2.691-5.879-7.79-12.394-13.385-14.306c-5.595-1.912-21.742-7.79-41.147-5.453C93.422,72.726,81.243,58.702,81.243,58.702z"
            />
          </svg>
        </div>
        {/* <Visualizer /> */}
      </TickersProvider>
    </div>
  );
};

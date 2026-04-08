# MEDIA FRANCHISES: The Artometrics of IP Revenue

A data analysis of 107 media franchises spanning 1923–2015, built on the [TidyTuesday 2019-07-02 dataset](https://github.com/rfordatascience/tidytuesday/tree/main/data/2019/2019-07-02).

## What's in this repo

- `franchise.qmd` — Quarto markdown file containing all R code, analysis, and write-up
- `media_franchises.csv` — raw dataset
- `chart1_top20_revenue.png` — top 20 franchises by total revenue (stacked bar)
- `chart2_revenue_per_year.png` — revenue per year of existence (lollipop)
- `chart3_merch_vs_other.png` — merchandise vs all other revenue (top 15)
- `chart4_origin_heatmap.png` — revenue category by original media type (heatmap)
- `chart5_age_vs_revenue.png` — age vs total revenue (scatter)

## What the analysis covers

Five charts working through how the most valuable IP in history actually makes its money:

1. Which franchises have earned the most — and what the color of every bar tells you
2. Which franchises are the most efficient earners per year of existence
3. How dependent the top franchises are on merchandise vs everything else
4. How a franchise's origin medium determines where its revenue comes from
5. Whether older franchises make more money — and why Pokémon breaks the model

## Read the full article

[artometrics.com/franchises](https://www.artometrics.com/franchises/)

## Tools

- R / Quarto
- tidyverse, ggplot2, ggtext, scales

## Data source

TidyTuesday (2019-07-02). *Media Franchise Revenues*. Originally compiled from Wikipedia's list of highest-grossing media franchises.

Chart 1 concept adapted from David Robinson's TidyTuesday screencast (2019-07-22): [youtu.be/1xsbTs9-a50](https://youtu.be/1xsbTs9-a50)

## Disclosure

This analysis is based on original data work (R / TidyTuesday). AI was used to assist in analysis, research, and writing.
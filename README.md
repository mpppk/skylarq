# SkylarQ
SkylarQ is CLI tool for automatically answering questionnaires of すかいらーく.

![demo](imgs/skylarq_demo.gif)

## Installation
```Shell
$ npm install -g skylarq
```

## Usage
1. Read terms of すかいらーく.
    * If you can agree terms, specify --i-agree-terms flag when execute.

1. Create setting file
    ```Shell
    $ skylarq --init
    setting file is created to /your/home/dir/path/skylarq.yml
    ```

1. Modify setting file
    ```Shell
    $ vim ~/skylarq.yml
    ```
    * Update receipt code
    * Input answers to questions 

1. Execute command
    ```Shell
    $ skylarq --i-agree-terms
    ```

    SkylarQ start answering the questions and finally display the coupon code
    
    ```Shell
    $ skylarq --i-agree-terms
    [==============================] 33/33 100% 10.0s 0.0s
    coupon code: 12345
    ```

## Option
### --init
Create setting file to home directory

### --i-agree-terms
Express agreement to the terms.  
(You must read terms and specify this flag before using SkylarQ.  
If you don't read yet or can't agree the terms, don't use this flag.)

### --browser, -b
Show browser while executing

### --filePath, -f
Specify setting file path (default path is `~/skylarq.yml`)

## Contribute
The question list in `skylarq.yml` is not complete yet.  
If you find unspecified questions, please create issue or send pull request!

## Others
This tool is aimed at labor-saving, not illegal automation of the questionnaire.  
However, if the tool affects the questionnaire adversely, we stop publishing promptly, so please contact me.

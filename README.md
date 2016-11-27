# SkylarQ
SkylarQ is CLI tool for automatically answering questionnaires of Skylark.

## Installation
```Shell
$ npm install -g skylarq
```

## Usage
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
    * Update answers to questions 

1. Execute command
    ```Shell
    $ skylarq
    ```

    SkylarQ start answering the questions and finally display the coupon code
    
    ```Shell
    $ skylarq
    [==============================] 33/33 100% 10.0s 0.0s
    coupon code: 12345
    ```

## Option
### --init
Create setting file to home directory

### --browser, -b
Show browser while executing

### --filePath, -f
Specify setting file path (default path is `~/skylarq.yml`)

## Contribute
The question list in `skylarq.yml` is not complete yet.  
If you find unspecified questions, please create issue or send pull request!

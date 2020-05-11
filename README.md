# cosopho-dashboard


There are three parts to the COSOPHO project.

1. The API
2. The Dashboard
3. The Frontend site

You should install and set them up in the order shown above.

You will also need.

1. An Auth0 account
2. A Cloudinary account
3. ElasticSearch set up.

## Installation instructions

You should install this second, the API should be installed first!

Steps

1. Check out this repo
2. Run `npm install`
3. Run `npm run build`
3. Setup your `.env` file, example shown below

**Running locally**, when you are running locally and the `NODE_ENV=development` is set to `development`, the code will automatically look for changes as you edit files and rebuild and restart if necessary.

If you don't want this behaviour use the `--skipBuild` command line parameter, i.e.

`npm run start -- --skipBuild`

When the app starts it will automatically open the brower, to stop it doing this use `--skipOpen` parameter.

You can combine both if you wish.

`npm run start -- --skipOpen --skipBuild`

If the app automatically restarts it may not always shut down properly, in this case you can kill it with the `kill` command. The process ID is stored in the `.pid` file.

`cat .pid`  
`kill -9 xxxxx` (where xxxxx is the number from the .pid file)

**Running remotely**, when you are running remotely you should set your `NODE_ENV=staging|production` to `staging` or `production`. You should also not let the app restart itself when it spots changes, there is no real harm in doing this, but it does mean "hot restarts" won't always be timely when using process managers.

You should make sure the app starts with the `--skipBuild` parameter, and make sure the build step is always run automatically.

i.e. update the code (through whatever deploy method you use) then make sure `npm run build` is executed to rebuild the app.

## .env file

You `.env` file should look something like this...

```
CALLBACK_URL=http://localhost:4001/callback
ELASTICSEARCH=http://localhost:9200
KEY=cosophoheroku_001
SIGNATURE=abcdef01234567890123456789012345
NODE_ENV=development
```

The `CALLBACK_URL` is used by Auth0 for it's call back. You need to make sure this url is registered with both the Auth0 **app** *and* **tenet** for logging in and out to work correctly.

`ELASTICSEARCH` is where your data is going to be stored.

`KEY` is used to _postfix_ the indexes in the ElasticSearch, for example, when you start up the app a `config_KEY` index will be created, in our example that would be `config_cosopho_001`. You should use the same `KEY` as the API.

This is done so a number of Cosopho instances can be run on the same ElasticSearch cluster, you would end up with several `config_*` indexes, and `users_*` indexes etc.

`SIGNATURE`, this is the _hashed_ version of the 'GOD' API signing token, generated from the `SIGNEDID` by the API. You should install and start the API first, check in it's log files for the `Admin sessionId: abcdef01234567890123456789012345`

Copy the `sessionId` from the logs of the API into the `.env` file of the dashboard.

`NODE_ENV=development` This will be set to `development`, `staging` or `production`. `development` only effects that "watcher" looking for files that have been changed so it can "hot-ish" reload.

`staging` and `production` both won't watch for file changes, other than that the only difference is the level of logging that happens.

[SPOILER: currently there is no difference between logging levels]

# Running the dashboard

**The API must be running for the dashboard to work, as the dashboard reads and writes to the API.**

When you first run the dashboard it will read the Auth0 created when you set up the API. If it's asking for the data again, check that the `KEY` matches in both the dashboard and API `.env` files.

Initial set-up steps you should take...

1. Select "Languages" from the menu. From the left hand panel select which languages can be used by _any_ instance created, and hit "Submit" at the bottom. Then from the right hand panel select the default language to be used on an instance, this can be overridden when you create an instance.

2. Now you can add some translations, by clicking on "Translations".

You can break down translations into sections to make working with them easier, for example one section may be "navigation". "Tokens" is an easy to remember short work or two that represents the translations string. Then enter the string into the left box below.

The strings added to the left box are the "default" strings, toggle the languages above the left column to enter the translations.

When an "owner" of an instance logs in, then can override the default translations with ones specific to their own instance.

The page shows the handlebars markup you'd use to access the translation from a template. Or you can create your own method of reading the strings from the API and presenting them.

Translations are stored in the database _not_ local files, therefor when you start up your instance you will not have any translations. If you already have translations set up on another instance if you add `/export` onto the end of the URL you can export a JSON file containing the strings by copying and pasting it, i.e.

`/administration/translations/export`

You can then import the strings by going to...

`http://localhost:4001/administration/translations/import`

...and pasting the JSON back in.

Be warned this will delete all the old translations and replace it with new ones, it will take a **LONG TIME** to import them into the database, so your templates may look a little odd while doing this.

3. Create an instance

Click on "Instances" and give an instance a title.

Once added, select the instance and pick which languages it can use and give it an Initiative or two

* * *

You should now have everything you need to spin up a front-end that points to your instance

If you click back to "Home" and then the "view the graphQL playground" link, you will get taken to the API, where you can run the following query...

```
{
  instances {
    id
    languages
		defaultLanguage
    title
    slug
    initiatives {
      id
      slug
      title
    }
  }
}
```

To get the instance and initiatives you've just added.

## Getting ready to install the Front-End - *IMPORTANT*

The front-end is a 3rd party "App" just like any other app that wished to use the API. To do so it will need it's own API **token**.

We do not have a place to register APPs for using the API yet. For the moment you will create a new user who will represent the front-end app.

Follow these steps.

1. Log out of the dashboard.
2. Click "Log in" and create a new user, finish logging in.
3. Log right back out again.
4. Log in as your first "Admin" user.
5. Select "Users" and look down at the "Developers" section.
6. Click on the user you've just added.
7. Under roles, make them an Admin user and hit "Update".
8. Make a note of their API Token.

This is the API token you are going to give to the front-end to use as it's API token.

It needs that token to _read_ the translations, and to _write_ photo and user data.

When the front-end calls the API as a user, it should use the user's `sessionId` to sign the API call. On the homepage of the dashboard, when you are logged in as an Admin user you will see a "Settings" sections, which has the "God" Signature. Make a copy of that and give it to the Front-end.

The Front-end will use that when it want to pretent to be _any_ signed in user.

An API **token** used by the front end will be either...

1. The API **token** of the user that we created to represent the front-end, in the format of `abcdef01234567890123456789012345678`
2. The API **token** as above, but signed with the `sessionId` of the user who is trying to upload/edit their own photos or profile, i.e. `abcdef01234567890123456789012345678-[user_sessionId]`
3. The API **token** as **1.** but signed with the 'GOD' signature, i.e. `abcdef01234567890123456789012345678-[GOD_sessionId]`



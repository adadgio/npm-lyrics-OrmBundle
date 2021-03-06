/**
 * The Orm wrapper.
 *
 * Sequelize for 'mysql'|'mariadb'|'sqlite'|'postgres'|'mssql': http://docs.sequelizejs.com/en/v3/docs/getting-started/
 * @todo Support other databases (mongodb, Neo4j, Rethinkdb)
 */
import { Console }      from '@lyrics/core';
import { Inject }       from '@lyrics/routing';
import { Sequelize }    from 'sequelize';
import { Service, ServiceInterface } from '@lyrics/component';
import { DependencyLoader }          from '@lyrics/core';

@Inject([
    { config: '%framework.database%' }, // value from config.*.yml
])
export class OrmService extends Service implements ServiceInterface
{
    private dbconf: any;
    private models: any;
    private handlers = {
        sequelize: null
    };

    // deps not yes injected
    constructor() {
        super();
    }

    // dependencies (inject) were injected by the container
    onInit() {
        // check the config exists
        if (this.injected.config === null) {
            Console.error(`orm-service: missing configuration values for framework.database item`);
            return;
        }
        
        this.setupOrm();
        DependencyLoader.readBundles('OrmBundle', ['model']);
    }

    setupOrm() {
        let db = this.injected.config;

        switch (this.getType()) {
            case 'mysql':

                this.handlers.sequelize = new Sequelize(db.name, db.username, db.password, {
                    host: db.host,
                    dialect: 'mysql',
                    pool: {
                        max: 5,
                        min: 0,
                        idle: 10000
                    },
                });

            break;
            case 'sqlite':

                this.handlers.sequelize = new Sequelize(db.name, db.username, db.password, {
                    host: db.host,
                    dialect: 'sqlite',
                    pool: {
                        max: 5,
                        min: 0,
                        idle: 10000
                    },
                    storage: db.sqlite.path, // SQLite only
                });

            break;
            default:
                // no orm type specified in config
            break;
        }
    }

    sequelize() {
        return this.handlers.sequelize;
    }

    getType() {
        return (typeof this.injected.config.type === 'undefined') ? null : this.injected.config.type;
    }

    getModel(name: string) {
        return (typeof this.models[name] === 'undefined') ? null : this.models[name];
    }

    addModels(models: Object) {
        // models is not an array but an object of classes
        // this.models = models;

        for (let className in models) {
            // get properties metadata defined with @Column decorator
            // const metadata = Reflect.getMetadata('test', models[className].constructor);
            let modelDefinitions: any = {};
            let metadata = Reflect.getMetadata('columns', models[className]);

            for (let prop in metadata) {
                modelDefinitions[prop] = {
                    type: this.typeToSequalizeType(metadata.type)
                };

                // handle primary key(s)
                if (typeof(metadata[prop].primaryKey) !== 'undefined' && metadata[prop].primaryKey === true) {
                    modelDefinitions[prop]['primaryKey'] = true;
                }
            }

            // define models in sequelize
            console.log(modelDefinitions);
            this.handlers.sequelize.define(className, modelDefinitions);
        }

        return this;
    }

    typeToSequalizeType(type: string) {
        let seqType: any;

        switch (type) {
            case 'string':
                seqType = Sequelize.STRING;
            break;
            case 'integer':
                seqType = Sequelize.INTEGER;
            break;
            case 'data':
                seqType = Sequelize.DATE;
            break;
            case 'boolean':
                seqType = Sequelize.BOOLEAN;
            break;
            default:
                seqType = Sequelize.STRING;
            break;
        }

        return seqType;
    }
}

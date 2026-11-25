import type { Database as DatabaseType } from 'better-sqlite3';

interface Migration {
    version:number;
    name:string;
    up: (db:DatabaseType) => void;
}

const hasColumn=(db: DatabaseType, table:string, column: string):boolean =>{
    const columns=db.prepare(`PRAGMA table_info(${table})`).all() as {name:string}[];
    return columns.some((c) => c.name===column);
};

export const migrations: Migration[]= [
    {
        version: 1,
        name: 'add_service_item_photo_columns',
        up:(db) =>{
            if (!hasColumn(db, 'service_items', 'photoPath')) {
            db.exec('ALTER TABLE service_items ADD COLUMN photoPath TEXT');
            }
            if (!hasColumn(db, 'service_items', 'photoMimeType')) {
                db.exec('ALTER TABLE service_items ADD COLUMN photoMimeType TEXT');
            }
            if (!hasColumn(db, 'service_items', 'photoUpdatedAt')) {
                db.exec('ALTER TABLE service_items ADD COLUMN photoUpdatedAt TEXT');
            }
        }
   },
   {
    version: 2,
    name: 'index_service_items_by_user',
    up: (db)=>{
        db.exec('CREATE INDEX IF NOT EXISTS idx_service_items_user_date ON service_items(userId, serviceDate DESC, createdAt DESC)');
    }
   }
];

export function runMigrations(db:DatabaseType):void{
    const current=Number(db.pragma('user_version', {simple:true}) ?? 0);
    const pending=migrations.filter((m)=> m.version > current).sort((a,b) =>a.version - b.version);

    for (const migration of pending){
        const apply= db.transaction(()=>{
            migration.up(db);
            db.pragma(`user_version=${migration.version}`);
        });
        apply();
        console.log(`[DB] Applied migration v${migration.version} : ${migration.name}`);
    }
}
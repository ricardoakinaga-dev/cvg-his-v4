export declare const rolePermissions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "role_permissions";
    schema: undefined;
    columns: {
        roleId: import("drizzle-orm/pg-core").PgColumn<{
            name: "role_id";
            tableName: "role_permissions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        permissionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "permission_id";
            tableName: "role_permissions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        grantedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "granted_at";
            tableName: "role_permissions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
//# sourceMappingURL=role_permissions.d.ts.map
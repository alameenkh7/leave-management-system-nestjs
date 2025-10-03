import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1759471324895 implements MigrationInterface {
  name = 'Migration1759471324895';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."leave_approvals_approvertype_enum" AS ENUM('reporting_manager', 'hr_manager')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_approvals_action_enum" AS ENUM('approve', 'reject')`,
    );
    await queryRunner.query(
      `CREATE TABLE "leave_approvals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "leaveRequestId" uuid NOT NULL, "approverId" uuid NOT NULL, "approverType" "public"."leave_approvals_approvertype_enum" NOT NULL, "action" "public"."leave_approvals_action_enum" NOT NULL, "comments" text NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_46118e498d40e7a5ff05f71e126" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_workflows_currentstage_enum" AS ENUM('pending_rm', 'pending_hr', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "leave_workflows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "leaveRequestId" uuid NOT NULL, "reportingManagerApproval" boolean NOT NULL DEFAULT false, "hrManagerApproval" boolean NOT NULL DEFAULT false, "currentStage" "public"."leave_workflows_currentstage_enum" NOT NULL DEFAULT 'pending_rm', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_e292243d8cd6c9fd3936e8850d" UNIQUE ("leaveRequestId"), CONSTRAINT "PK_568e285f3dc48d8653ef8ead05b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_requests_leavetype_enum" AS ENUM('casual', 'sick', 'vacation', 'maternity')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."leave_requests_status_enum" AS ENUM('pending', 'pending_hr', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "leave_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employeeId" uuid NOT NULL, "leaveType" "public"."leave_requests_leavetype_enum" NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "totalDays" integer NOT NULL, "reason" text NOT NULL, "status" "public"."leave_requests_status_enum" NOT NULL DEFAULT 'pending', "appliedAt" TIMESTAMP NOT NULL DEFAULT now(), "documents" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d3abcf9a16cef1450129e06fa9f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."employees_role_enum" AS ENUM('employee', 'reporting_manager', 'hr_manager', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employeeCode" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "department" character varying NOT NULL, "role" "public"."employees_role_enum" NOT NULL DEFAULT 'employee', "reportingManagerId" uuid, "joinDate" date NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "casualLeaveBalance" integer NOT NULL DEFAULT '12', "sickLeaveBalance" integer NOT NULL DEFAULT '10', "vacationLeaveBalance" integer NOT NULL DEFAULT '18', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e3d0372d1ebe64cf827743666ce" UNIQUE ("employeeCode"), CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af" UNIQUE ("email"), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_approvals" ADD CONSTRAINT "FK_f9d987693b8da6a02b566158512" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_approvals" ADD CONSTRAINT "FK_ffa85f79b5fde37f5336d39e240" FOREIGN KEY ("approverId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_workflows" ADD CONSTRAINT "FK_e292243d8cd6c9fd3936e8850da" FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_4eda1468756ca831495e308e407" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "FK_12c6c1ac43cccd5c7b71fe5e53a" FOREIGN KEY ("reportingManagerId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "employees" DROP CONSTRAINT "FK_12c6c1ac43cccd5c7b71fe5e53a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_4eda1468756ca831495e308e407"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_workflows" DROP CONSTRAINT "FK_e292243d8cd6c9fd3936e8850da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_approvals" DROP CONSTRAINT "FK_ffa85f79b5fde37f5336d39e240"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leave_approvals" DROP CONSTRAINT "FK_f9d987693b8da6a02b566158512"`,
    );
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(`DROP TYPE "public"."employees_role_enum"`);
    await queryRunner.query(`DROP TABLE "leave_requests"`);
    await queryRunner.query(`DROP TYPE "public"."leave_requests_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."leave_requests_leavetype_enum"`,
    );
    await queryRunner.query(`DROP TABLE "leave_workflows"`);
    await queryRunner.query(
      `DROP TYPE "public"."leave_workflows_currentstage_enum"`,
    );
    await queryRunner.query(`DROP TABLE "leave_approvals"`);
    await queryRunner.query(`DROP TYPE "public"."leave_approvals_action_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."leave_approvals_approvertype_enum"`,
    );
  }
}

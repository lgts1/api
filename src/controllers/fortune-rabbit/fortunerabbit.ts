import { Request, Response } from "express"
import axios from "axios"
import logger from "../../logger"
import * as crypto from "crypto"
import { v4 } from "uuid"
import moment from "moment"
import allfunctions from "../../functions/allfunctions"
import apicontroller from "../apicontroller"
import { emitirEventoInterno, adicionarListener } from "../../serverEvents"
import "dotenv/config"
import fortunerabbitfunctions from "../../functions/fortune-rabbit/fortunerabbitfunctions"
import notcashrabbit from "../../jsons/fortune-rabbit/notcashrabbit"
import linhaperdarabbit from "../../jsons/fortune-rabbit/linhaperdarabbit"
import linhaganhorabbit from "../../jsons/fortune-rabbit/linhaganhorabbit"
import linhabonusrabbit from "../../jsons/fortune-rabbit/linhabonusrabbit"

export default {
   async getrabbit(req: Request, res: Response) {
      try {
         const token = req.body.atk
         const user = await fortunerabbitfunctions.getuserbyatk(token)

         const jsonformatado = await JSON.parse('{"dt":{"fb":null,"wt":{"mw":5,"bw":20,"mgw":35,"smgw":50},"maxwm":5000,"cs":[0.05,0.5,4],"ml":[1,2,3,4,5,6,7,8,9,10],"mxl":10,"bl":20,"inwe":false,"iuwe":false,"ls":{"si":{"wp":null,"lw":null,"orl":[2,2,0,99,8,8,8,8,2,2,0,99],"ift":false,"iff":false,"cpf":{"1":{"p":4,"bv":2500,"m":500},"2":{"p":5,"bv":100,"m":20},"3":{"p":6,"bv":25,"m":5},"4":{"p":7,"bv":2.5,"m":0.5}},"cptw":0,"crtw":0,"imw":false,"fs":null,"gwt":0,"fb":null,"ctw":0,"pmt":null,"cwc":0,"fstc":null,"pcwc":0,"rwsp":null,"hashr":null,"ml":10,"cs":0.05,"rl":[2,2,0,99,8,8,8,8,2,2,0,99],"sid":"0","psid":"0","st":1,"nst":1,"pf":0,"aw":0,"wid":0,"wt":"C","wk":"0_C","wbn":null,"wfg":null,"blb":0,"blab":0,"bl":20,"tb":0,"tbb":0,"tw":0,"np":0,"ocr":null,"mr":null,"ge":null}},"cc":"BRL"},"err":null}')

         res.send({
            dt: {
               fb: jsonformatado.dt.fb,
               wt: jsonformatado.dt.wt,
               maxwm: jsonformatado.dt.maxwm,
               cs: jsonformatado.dt.cs,
               ml: jsonformatado.dt.ml,
               mxl: jsonformatado.dt.mxl,
               bl: user[0].saldo,
               inwe: jsonformatado.dt.inwe,
               iuwe: jsonformatado.dt.iuwe,
               ls: jsonformatado.dt.ls,
               cc: "BRL",
            },
            err: null,
         })
      } catch (error) {
         logger.error(error)
      }
   },
   async spin(req: Request, res: Response) {
      let cs: number = req.body.cs
      let ml: number = req.body.ml
      const token = req.body.atk

      async function lwchange(json1: { [key: string]: any }, json2: { [key: string]: any }, cs: number, ml: number) {
         for (let chave in json1) {
            if (json1.hasOwnProperty(chave)) {
               const valor = json1[chave]
               const ganho = cs * ml * parseFloat(valor)
               // Verifica se a chave existe no segundo JSON
               for (let chave2 in json2) {
                  if (json2.hasOwnProperty(chave2)) {
                     // Altera o valor correspondente no segundo JSON
                     json2[chave] = ganho
                  }
               }
            }
         }
      }

      async function countrwsp(json: { [key: string]: any }) {
         let multplicador: number = 0
         for (let i = 1; i <= 10; i++) {
            const chave = i.toString()
            if (json.hasOwnProperty(chave)) {
               multplicador = multplicador + parseFloat(json[chave])
            }
         }
         return multplicador
      }
      async function gerarNumeroUnico() {
         return crypto.randomBytes(8).toString("hex")
      }
      async function retornamultis(json: { [key: string]: any }): Promise<string[]> {
         const numerosVerificados: string[] = []
         // Iterar sobre os índices em 'mt'
         for (const chaveMT in json.cpf) {
            numerosVerificados.push(json.cpf[chaveMT].bv)
         }
         return numerosVerificados
      }

      async function bvchange(bet: number, json: { [key: string]: any }) {
         for (const chave in json) {
            json[chave].bv = cs * ml * 10 * parseFloat(json[chave].m)
         }
      }
      try {
         const user = await fortunerabbitfunctions.getuserbyatk(token)
         let bet: number = cs * ml * 10
         let saldoatual: number = user[0].saldo
         const gamename = "fortune-rabbit"

         emitirEventoInterno("att", {
            token: token,
            username: user[0].username,
            bet: bet,
            saldo: saldoatual,
            rtp: user[0].rtp,
            agentid: user[0].agentid,
            gamecode: gamename,
         })
         const agent = await allfunctions.getagentbyid(user[0].agentid)

         const retornado = user[0].valorganho
         const valorapostado = user[0].valorapostado

         const rtp = (retornado / valorapostado) * 100


         const resultadospin = await allfunctions.calcularganho(bet, saldoatual, token, gamename)

         if (resultadospin.result === "perda" || resultadospin.result === "ganho") {
            if (saldoatual < bet) {
               const semsaldo = await notcashrabbit.notcash(saldoatual, cs, ml)
               res.send(semsaldo)
               return false
            }
         }

         if (resultadospin.result === "perda") {
            let newbalance = saldoatual - bet
            await fortunerabbitfunctions.attsaldobyatk(token, newbalance)
            await fortunerabbitfunctions.atualizardebitado(token, bet)
            await fortunerabbitfunctions.atualizarapostado(token, bet)
            const perdajson = await linhaperdarabbit.linhaperda()

            if (Object.keys(perdajson.cpf).length > 0) {
               await bvchange(bet, perdajson.cpf)
            }

            let json: any = {
               dt: {
                  si: {
                     wp: null,
                     lw: null,
                     orl: perdajson.orl,
                     ift: perdajson.ift,
                     iff: false,
                     cpf: perdajson.cpf,
                     cptw: 0.0,
                     crtw: 0.0,
                     imw: false,
                     fs: null,
                     gwt: -1,
                     fb: null,
                     ctw: 0.0,
                     pmt: null,
                     cwc: 0,
                     fstc: null,
                     pcwc: 0,
                     rwsp: null,
                     hashr: "0:6;7;6#6;7;3#4;6;3#99;6;99#MV#6.0#MT#1#MG#0#",
                     ml: ml,
                     cs: cs,
                     rl: perdajson.rl,
                     sid: "1762943147845811712",
                     psid: "1762943147845811712",
                     st: 1,
                     nst: 1,
                     pf: 1,
                     aw: 0.0,
                     wid: 0,
                     wt: "C",
                     wk: "0_C",
                     wbn: null,
                     wfg: null,
                     blb: saldoatual,
                     blab: newbalance,
                     bl: newbalance,
                     tb: bet,
                     tbb: bet,
                     tw: 0.0,
                     np: -bet,
                     ocr: null,
                     mr: null,
                     ge: [1, 11],
                  },
               },
               err: null,
            }

            await fortunerabbitfunctions.savejsonspin(user[0].id, JSON.stringify(json))
            const txnid = v4()
            const dataFormatada: string = moment().toISOString()
            await apicontroller.callbackgame({
               agent_code: agent[0].agentcode,
               agent_secret: agent[0].secretKey,
               user_code: user[0].username,
               user_balance: user[0].saldo,
               user_total_credit: user[0].valorganho,
               user_total_debit: user[0].valorapostado,
               game_type: "slot",
               slot: {
                  provider_code: "PGSOFT",
                  game_code: gamename,
                  round_id: await gerarNumeroUnico(),
                  type: "BASE",
                  bet: bet,
                  win: 0,
                  txn_id: `${txnid}`,
                  txn_type: "debit_credit",
                  is_buy: false,
                  is_call: false,
                  user_before_balance: user[0].saldo,
                  user_after_balance: newbalance,
                  agent_before_balance: 100,
                  agent_after_balance: 100,
                  created_at: dataFormatada,
               },
            })
            res.send(json)
         }
         if (resultadospin.result === "ganho") {
            const ganhojson = await linhaganhorabbit.linhaganho(bet)
            const multplicador = await countrwsp(ganhojson.rwsp)
            await lwchange(ganhojson.rwsp, ganhojson.lw, cs, ml)
            let valorganho = cs * ml * multplicador

            const newbalance = saldoatual + valorganho - bet
            await fortunerabbitfunctions.attsaldobyatk(token, newbalance)
            await fortunerabbitfunctions.atualizardebitado(token, bet)
            await fortunerabbitfunctions.atualizarapostado(token, bet)
            await fortunerabbitfunctions.atualizarganho(token, valorganho)

            let json: any = {
               dt: {
                  si: {
                     wp: ganhojson.wp,
                     lw: ganhojson.lw,
                     orl: ganhojson.orl,
                     ift: ganhojson.ift,
                     iff: false,
                     cpf: ganhojson.cpf,
                     cptw: 0.0,
                     crtw: 0.0,
                     imw: false,
                     fs: null,
                     gwt: -1,
                     fb: null,
                     ctw: valorganho,
                     pmt: null,
                     cwc: 1,
                     fstc: null,
                     pcwc: 1,
                     rwsp: ganhojson.rwsp,
                     hashr: "0:5;4;3#0;4;5#4;5;5#99;5;99#R#5#011221#MV#0.60#MT#1#R#5#011222#MV#0.60#MT#1#MG#0.60#",
                     ml: ml,
                     cs: cs,
                     rl: ganhojson.rl,
                     sid: "1763012551040237056",
                     psid: "1763012551040237056",
                     st: 1,
                     nst: 1,
                     pf: 1,
                     aw: valorganho,
                     wid: 0,
                     wt: "C",
                     wk: "0_C",
                     wbn: null,
                     wfg: null,
                     blb: saldoatual,
                     blab: newbalance,
                     bl: newbalance,
                     tb: bet,
                     tbb: bet,
                     tw: valorganho,
                     np: bet,
                     ocr: null,
                     mr: null,
                     ge: [1, 11],
                  },
               },
               err: null,
            }
            await fortunerabbitfunctions.savejsonspin(user[0].id, JSON.stringify(json))

            const txnid = v4()
            const dataFormatada: string = moment().toISOString()

            await apicontroller.callbackgame({
               agent_code: agent[0].agentcode,
               agent_secret: agent[0].secretKey,
               user_code: user[0].username,
               user_balance: user[0].saldo,
               user_total_credit: user[0].valorganho,
               user_total_debit: user[0].valorapostado,
               game_type: "slot",
               slot: {
                  provider_code: "PGSOFT",
                  game_code: gamename,
                  round_id: await gerarNumeroUnico(),
                  type: "BASE",
                  bet: bet,
                  win: Number(valorganho),
                  txn_id: `${txnid}`,
                  txn_type: "debit_credit",
                  is_buy: false,
                  is_call: false,
                  user_before_balance: user[0].saldo,
                  user_after_balance: newbalance,
                  agent_before_balance: 100,
                  agent_after_balance: 100,
                  created_at: dataFormatada,
               },
            })
            res.send(json)
         }
         if (resultadospin.result === "bonus" && resultadospin.gamecode === "fortune-rabbit") {
            const bonusjson = await linhabonusrabbit.linhabonus(resultadospin.json)
            let call = await allfunctions.getcallbyid(resultadospin.idcall)

            if (call[0].steps === null && call[0].status === "pending") {
               if (saldoatual < bet) {
                  const semsaldo = await notcashrabbit.notcash(saldoatual, cs, ml)
                  res.send(semsaldo)
                  return false
               }
            }

            if (call[0].steps === null && call[0].status === "pending") {
               const steps = Object.keys(bonusjson).length - 1
               await allfunctions.updatestepscall(resultadospin.idcall, steps)
            }
            const txnid = v4()
            const dataFormatada: string = moment().toISOString()

            let calltwo = await allfunctions.getcallbyid(resultadospin.idcall)

            if (calltwo[0].steps === 0) {
               await allfunctions.completecall(calltwo[0].id)
            }
            let mulplicadoresjson: any = {}

            if (Object.keys(bonusjson[calltwo[0].steps].cpf).length > 0) {
               await bvchange(bet, bonusjson[calltwo[0].steps].cpf)
            }

            if (Object.keys(bonusjson[calltwo[0].steps].cpf).length > 4) {
               mulplicadoresjson = await retornamultis(bonusjson[calltwo[0].steps])
            }

            let valorganho = 0
            let mulplicadores = 0

            for (let chave in mulplicadoresjson) {
               mulplicadores = mulplicadores + parseFloat(mulplicadoresjson[chave])
            }
            //FAZ O CALCULO DO VALOR GANHO
            if (Object.keys(bonusjson[calltwo[0].steps].cpf).length > 4) {
               valorganho = mulplicadores
            }

            console.log("MULT JSON " + JSON.stringify(mulplicadoresjson))
            console.log("valorganho  " + valorganho)
            let newbalance = 0

            if (calltwo[0].steps === Object.keys(bonusjson).length - 1) {
               newbalance = saldoatual - bet + valorganho
               await fortunerabbitfunctions.attsaldobyatk(token, newbalance)
               await apicontroller.callbackgame({
                  agent_code: agent[0].agentcode,
                  agent_secret: agent[0].secretKey,
                  user_code: user[0].username,
                  user_balance: user[0].saldo,
                  user_total_credit: user[0].valorganho,
                  user_total_debit: user[0].valorapostado,
                  game_type: "slot",
                  slot: {
                     provider_code: "PGSOFT",
                     game_code: gamename,
                     round_id: await gerarNumeroUnico(),
                     type: "BASE",
                     bet: bet,
                     win: valorganho,
                     txn_id: `${txnid}`,
                     txn_type: "debit_credit",
                     is_buy: false,
                     is_call: false,
                     user_before_balance: user[0].saldo,
                     user_after_balance: newbalance,
                     agent_before_balance: 100,
                     agent_after_balance: 100,
                     created_at: dataFormatada,
                  },
               })
            }

            await fortunerabbitfunctions.attawcall(calltwo[0].id, valorganho)
            newbalance = saldoatual + valorganho

            if (calltwo[0].steps === 0) {
               newbalance = saldoatual + valorganho - bet
            }

            await fortunerabbitfunctions.attsaldobyatk(token, newbalance)
            await fortunerabbitfunctions.atualizardebitado(token, bet)
            await fortunerabbitfunctions.atualizarapostado(token, bet)
            await fortunerabbitfunctions.atualizarganho(token, valorganho)
            if (calltwo[0].steps > 0) {
               await allfunctions.subtrairstepscall(resultadospin.idcall)
            }
            if (bonusjson[calltwo[0].steps].fs.hasOwnProperty("aw")) {
               bonusjson[calltwo[0].steps].fs["aw"] = (await allfunctions.getcallbyid(resultadospin.idcall))[0].aw
            }

            let json: any = {
               dt: {
                  si: {
                     wp: null,
                     lw: null,
                     orl: bonusjson[calltwo[0].steps].orl,
                     ift: false,
                     iff: true,
                     cpf: bonusjson[calltwo[0].steps].cpf,
                     cptw: valorganho,
                     crtw: (await allfunctions.getcallbyid(resultadospin.idcall))[0].aw,
                     imw: false,
                     fs: bonusjson[calltwo[0].steps].fs,
                     gwt: -1,
                     fb: null,
                     ctw: (await allfunctions.getcallbyid(resultadospin.idcall))[0].aw,
                     pmt: null,
                     cwc: bonusjson[calltwo[0].steps].cwc,
                     fstc: null,
                     pcwc: bonusjson[calltwo[0].steps].pcwc,
                     rwsp: null,
                     hashr: "0:1;8;8#1;8;8#1;1;1#99;1;99#MV#6.0#MT#1#MG#0#",
                     ml: ml,
                     cs: cs,
                     rl: bonusjson[calltwo[0].steps].rl,
                     sid: "1763334297559694849",
                     psid: "1763334297559694849",
                     st: bonusjson[calltwo[0].steps].st,
                     nst: bonusjson[calltwo[0].steps].nst,
                     pf: 1,
                     aw: (await allfunctions.getcallbyid(resultadospin.idcall))[0].aw,
                     wid: (await allfunctions.getcallbyid(resultadospin.idcall))[0].aw,
                     wt: "C",
                     wk: "0_C",
                     wbn: null,
                     wfg: null,
                     blb: saldoatual,
                     blab: newbalance,
                     bl: newbalance,
                     tb: bet,
                     tbb: bet,
                     tw: valorganho,
                     np: valorganho,
                     ocr: null,
                     mr: null,
                     ge: [2, 11],
                  },
               },
               err: null,
            }

            await fortunerabbitfunctions.savejsonspin(user[0].id, JSON.stringify(json))

            await apicontroller.callbackgame({
               agent_code: agent[0].agentcode,
               agent_secret: agent[0].secretKey,
               user_code: user[0].username,
               user_balance: user[0].saldo,
               user_total_credit: user[0].valorganho,
               user_total_debit: user[0].valorapostado,
               game_type: "slot",
               slot: {
                  provider_code: "PGSOFT",
                  game_code: gamename,
                  round_id: await gerarNumeroUnico(),
                  type: "BASE",
                  bet: 0,
                  win: Number(valorganho),
                  txn_id: `${txnid}`,
                  txn_type: "debit_credit",
                  is_buy: false,
                  is_call: true,
                  user_before_balance: user[0].saldo,
                  user_after_balance: newbalance,
                  agent_before_balance: 100,
                  agent_after_balance: 100,
                  created_at: dataFormatada,
               },
            })
            res.send(json)
         }
      } catch (error) {
         logger.error(error)
      }
   },
}
